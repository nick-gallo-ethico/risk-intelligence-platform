import { Test, TestingModule } from "@nestjs/testing";
import { EmailProcessor } from "./email.processor";
import { MailerService } from "@nestjs-modules/mailer";
import { DeliveryTrackerService } from "../../notifications/services/delivery-tracker.service";
import { Job } from "bullmq";

describe("EmailProcessor", () => {
  let processor: EmailProcessor;

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  const mockDeliveryTrackerService = {
    recordSent: jest.fn(),
    recordFailed: jest.fn(),
    recordPermanentFailure: jest.fn(),
  };

  const makeJob = (data: Record<string, unknown>): Job<any> =>
    ({
      id: "job-test-123",
      data,
      attemptsMade: 1,
      opts: { attempts: 3 },
      returnvalue: null,
    }) as unknown as Job<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        { provide: MailerService, useValue: mockMailerService },
        {
          provide: DeliveryTrackerService,
          useValue: mockDeliveryTrackerService,
        },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
    jest.clearAllMocks();
  });

  describe("process", () => {
    const validJobData = {
      organizationId: "org-123",
      to: "recipient@example.com",
      subject: "Test Email Subject",
      html: "<p>Hello World</p>",
      templateId: "case-notification",
      notificationId: "notif-123",
      context: {},
    };

    it("should send email successfully and record sent", async () => {
      mockMailerService.sendMail.mockResolvedValue({
        messageId: "<msg-id@domain.com>",
      });
      mockDeliveryTrackerService.recordSent.mockResolvedValue(undefined);

      const result = await processor.process(makeJob(validJobData));

      expect(result.messageId).toBe("msg-id@domain.com");
      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "recipient@example.com",
          subject: "Test Email Subject",
          html: "<p>Hello World</p>",
        }),
      );
      expect(mockDeliveryTrackerService.recordSent).toHaveBeenCalledWith(
        "notif-123",
        "msg-id@domain.com",
      );
    });

    it("should throw error when required fields are missing", async () => {
      const invalidJobData = {
        organizationId: "org-123",
        to: "recipient@example.com",
        // missing subject and html
        notificationId: "notif-123",
        templateId: "test",
        context: {},
      };

      await expect(processor.process(makeJob(invalidJobData))).rejects.toThrow(
        "Missing required email fields",
      );
    });

    it("should record failure and rethrow when send fails", async () => {
      mockMailerService.sendMail.mockRejectedValue(
        new Error("SMTP connection refused"),
      );
      mockDeliveryTrackerService.recordFailed.mockResolvedValue(undefined);

      await expect(processor.process(makeJob(validJobData))).rejects.toThrow(
        "SMTP connection refused",
      );
      expect(mockDeliveryTrackerService.recordFailed).toHaveBeenCalledWith(
        "notif-123",
        "SMTP connection refused",
      );
    });

    it("should use fallback messageId when provider returns no messageId", async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: null });
      mockDeliveryTrackerService.recordSent.mockResolvedValue(undefined);

      const result = await processor.process(makeJob(validJobData));

      expect(result.messageId).toContain("local-");
    });

    it("should not call recordSent/recordFailed when notificationId is missing", async () => {
      const dataWithoutNotifId = {
        ...validJobData,
        notificationId: undefined,
      };
      mockMailerService.sendMail.mockResolvedValue({ messageId: "msg-1" });

      await processor.process(makeJob(dataWithoutNotifId));

      expect(mockDeliveryTrackerService.recordSent).not.toHaveBeenCalled();
    });
  });
});
