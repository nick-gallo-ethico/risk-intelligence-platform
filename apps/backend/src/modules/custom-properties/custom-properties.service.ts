import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CustomPropertyEntityType,
  PropertyDataType,
  Prisma,
  CustomPropertyDefinition,
} from '@prisma/client';
import {
  CreateCustomPropertyDto,
  UpdateCustomPropertyDto,
  ValidationRules,
  SelectOption,
  ValidationResult,
} from './dto/custom-property.dto';

@Injectable()
export class CustomPropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateCustomPropertyDto,
  ) {
    // Validate key format (alphanumeric, underscore, starts with letter)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(dto.key)) {
      throw new BadRequestException(
        'Key must start with a letter and contain only letters, numbers, and underscores',
      );
    }

    // Check for duplicate key
    const existing = await this.prisma.customPropertyDefinition.findFirst({
      where: {
        organizationId,
        entityType: dto.entityType,
        key: dto.key,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Property with key "${dto.key}" already exists for ${dto.entityType}`,
      );
    }

    // Validate options for SELECT/MULTI_SELECT
    if (
      (dto.dataType === PropertyDataType.SELECT ||
        dto.dataType === PropertyDataType.MULTI_SELECT) &&
      (!dto.options || dto.options.length === 0)
    ) {
      throw new BadRequestException(
        'SELECT and MULTI_SELECT types require options',
      );
    }

    return this.prisma.customPropertyDefinition.create({
      data: {
        organizationId,
        entityType: dto.entityType,
        name: dto.name,
        key: dto.key,
        description: dto.description,
        dataType: dto.dataType,
        isRequired: dto.isRequired || false,
        defaultValue: dto.defaultValue as Prisma.InputJsonValue,
        options: dto.options as unknown as Prisma.InputJsonValue,
        validationRules: dto.validationRules as unknown as Prisma.InputJsonValue,
        displayOrder: dto.displayOrder || 0,
        groupName: dto.groupName,
        helpText: dto.helpText,
        placeholder: dto.placeholder,
        width: dto.width,
        createdById: userId,
      },
    });
  }

  async findById(organizationId: string, id: string) {
    const definition = await this.prisma.customPropertyDefinition.findFirst({
      where: { id, organizationId },
    });

    if (!definition) {
      throw new NotFoundException('Custom property definition not found');
    }

    return definition;
  }

  async findByEntityType(
    organizationId: string,
    entityType: CustomPropertyEntityType,
  ) {
    return this.prisma.customPropertyDefinition.findMany({
      where: {
        organizationId,
        entityType,
        isActive: true,
      },
      orderBy: [
        { groupName: 'asc' },
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findAll(organizationId: string, includeInactive: boolean = false) {
    const where: Prisma.CustomPropertyDefinitionWhereInput = {
      organizationId,
      ...(includeInactive ? {} : { isActive: true }),
    };

    const definitions = await this.prisma.customPropertyDefinition.findMany({
      where,
      orderBy: [
        { entityType: 'asc' },
        { groupName: 'asc' },
        { displayOrder: 'asc' },
      ],
    });

    // Group by entity type
    const grouped = definitions.reduce<
      Record<string, CustomPropertyDefinition[]>
    >(
      (acc, def) => {
        const key = def.entityType;
        if (!acc[key]) acc[key] = [];
        acc[key].push(def);
        return acc;
      },
      {},
    );

    return {
      data: definitions,
      grouped,
    };
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateCustomPropertyDto,
  ) {
    // Ensure definition exists (throws if not found)
    await this.findById(organizationId, id);

    // Cannot change dataType if property has been used
    // (Future: check for existing values)

    return this.prisma.customPropertyDefinition.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
        ...(dto.defaultValue !== undefined && {
          defaultValue: dto.defaultValue as Prisma.InputJsonValue,
        }),
        ...(dto.options && {
          options: dto.options as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.validationRules !== undefined && {
          validationRules: dto.validationRules as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.displayOrder !== undefined && {
          displayOrder: dto.displayOrder,
        }),
        ...(dto.groupName !== undefined && { groupName: dto.groupName }),
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
        ...(dto.helpText !== undefined && { helpText: dto.helpText }),
        ...(dto.placeholder !== undefined && { placeholder: dto.placeholder }),
        ...(dto.width !== undefined && { width: dto.width }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async delete(organizationId: string, id: string) {
    await this.findById(organizationId, id);

    // Soft delete by deactivating
    return this.prisma.customPropertyDefinition.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async reorder(
    organizationId: string,
    entityType: CustomPropertyEntityType,
    propertyOrders: { id: string; displayOrder: number }[],
  ) {
    await this.prisma.$transaction(
      propertyOrders.map(({ id, displayOrder }) =>
        this.prisma.customPropertyDefinition.updateMany({
          where: { id, organizationId, entityType },
          data: { displayOrder },
        }),
      ),
    );
  }

  // Value validation
  async validateValues(
    organizationId: string,
    entityType: CustomPropertyEntityType,
    values: Record<string, unknown>,
  ): Promise<ValidationResult> {
    const definitions = await this.findByEntityType(organizationId, entityType);
    const errors: { key: string; message: string }[] = [];
    const sanitized: Record<string, unknown> = {};

    for (const def of definitions) {
      const value = values[def.key];

      // Check required
      if (
        def.isRequired &&
        (value === undefined || value === null || value === '')
      ) {
        errors.push({ key: def.key, message: `${def.name} is required` });
        continue;
      }

      // Skip if no value and not required
      if (value === undefined || value === null || value === '') {
        if (def.defaultValue !== null) {
          sanitized[def.key] = def.defaultValue;
        }
        continue;
      }

      // Type-specific validation
      const validation = this.validateValue(
        def.dataType,
        value,
        def.validationRules,
        def.options,
      );
      if (validation.error) {
        errors.push({ key: def.key, message: validation.error });
      } else {
        sanitized[def.key] = validation.value;
      }
    }

    // Warn about unknown keys (but don't fail)
    const knownKeys = new Set(definitions.map((d: CustomPropertyDefinition) => d.key));
    for (const key of Object.keys(values)) {
      if (!knownKeys.has(key) && values[key] !== undefined) {
        // Keep unknown values but don't validate them
        sanitized[key] = values[key];
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized,
    };
  }

  // Get default values for a new entity
  async getDefaultValues(
    organizationId: string,
    entityType: CustomPropertyEntityType,
  ): Promise<Record<string, unknown>> {
    const definitions = await this.findByEntityType(organizationId, entityType);
    const defaults: Record<string, unknown> = {};

    for (const def of definitions) {
      if (def.defaultValue !== null) {
        defaults[def.key] = def.defaultValue;
      }
    }

    return defaults;
  }

  private validateValue(
    dataType: PropertyDataType,
    value: unknown,
    rules: unknown,
    options: unknown,
  ): { value?: unknown; error?: string } {
    const validationRules = rules as ValidationRules | null;
    const selectOptions = options as SelectOption[] | null;

    switch (dataType) {
      case PropertyDataType.TEXT:
        return this.validateText(value, validationRules);

      case PropertyDataType.NUMBER:
        return this.validateNumber(value, validationRules);

      case PropertyDataType.DATE:
      case PropertyDataType.DATETIME:
        return this.validateDate(value, validationRules);

      case PropertyDataType.SELECT:
        return this.validateSelect(value, selectOptions);

      case PropertyDataType.MULTI_SELECT:
        return this.validateMultiSelect(value, selectOptions);

      case PropertyDataType.BOOLEAN:
        return this.validateBoolean(value);

      case PropertyDataType.URL:
        return this.validateUrl(value);

      case PropertyDataType.EMAIL:
        return this.validateEmail(value);

      case PropertyDataType.PHONE:
        return this.validatePhone(value);

      default:
        return { value };
    }
  }

  private validateText(
    value: unknown,
    rules: ValidationRules | null,
  ): { value?: string; error?: string } {
    if (typeof value !== 'string') {
      return { error: 'Must be a text value' };
    }

    const textRules = rules as {
      minLength?: number;
      maxLength?: number;
      pattern?: string;
    } | null;

    if (textRules?.minLength && value.length < textRules.minLength) {
      return { error: `Must be at least ${textRules.minLength} characters` };
    }

    if (textRules?.maxLength && value.length > textRules.maxLength) {
      return { error: `Must be at most ${textRules.maxLength} characters` };
    }

    if (textRules?.pattern) {
      try {
        const regex = new RegExp(textRules.pattern);
        if (!regex.test(value)) {
          return { error: 'Does not match required format' };
        }
      } catch {
        // Invalid regex, skip pattern validation
      }
    }

    return { value };
  }

  private validateNumber(
    value: unknown,
    rules: ValidationRules | null,
  ): { value?: number; error?: string } {
    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (typeof num !== 'number' || isNaN(num)) {
      return { error: 'Must be a number' };
    }

    const numRules = rules as {
      min?: number;
      max?: number;
      decimals?: number;
    } | null;

    if (numRules?.min !== undefined && num < numRules.min) {
      return { error: `Must be at least ${numRules.min}` };
    }

    if (numRules?.max !== undefined && num > numRules.max) {
      return { error: `Must be at most ${numRules.max}` };
    }

    if (numRules?.decimals !== undefined) {
      const rounded = parseFloat(num.toFixed(numRules.decimals));
      return { value: rounded };
    }

    return { value: num };
  }

  private validateDate(
    value: unknown,
    rules: ValidationRules | null,
  ): { value?: string; error?: string } {
    if (typeof value !== 'string') {
      return { error: 'Must be a date string' };
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { error: 'Invalid date format' };
    }

    const dateRules = rules as {
      minDate?: string;
      maxDate?: string;
      allowFuture?: boolean;
      allowPast?: boolean;
    } | null;

    if (dateRules?.minDate) {
      const min = new Date(dateRules.minDate);
      if (date < min) {
        return { error: `Date must be on or after ${dateRules.minDate}` };
      }
    }

    if (dateRules?.maxDate) {
      const max = new Date(dateRules.maxDate);
      if (date > max) {
        return { error: `Date must be on or before ${dateRules.maxDate}` };
      }
    }

    if (dateRules?.allowFuture === false && date > new Date()) {
      return { error: 'Future dates are not allowed' };
    }

    if (dateRules?.allowPast === false && date < new Date()) {
      return { error: 'Past dates are not allowed' };
    }

    return { value: date.toISOString() };
  }

  private validateSelect(
    value: unknown,
    options: SelectOption[] | null,
  ): { value?: string; error?: string } {
    if (typeof value !== 'string') {
      return { error: 'Must be a string value' };
    }

    if (options && !options.some((o) => o.value === value)) {
      return { error: 'Invalid option selected' };
    }

    return { value };
  }

  private validateMultiSelect(
    value: unknown,
    options: SelectOption[] | null,
  ): { value?: string[]; error?: string } {
    if (!Array.isArray(value)) {
      return { error: 'Must be an array of values' };
    }

    const stringValues = value.filter((v): v is string => typeof v === 'string');

    if (options) {
      const validValues = new Set(options.map((o) => o.value));
      const invalid = stringValues.filter((v) => !validValues.has(v));
      if (invalid.length > 0) {
        return { error: `Invalid options: ${invalid.join(', ')}` };
      }
    }

    return { value: stringValues };
  }

  private validateBoolean(value: unknown): { value?: boolean; error?: string } {
    if (typeof value === 'boolean') {
      return { value };
    }
    if (value === 'true' || value === '1') {
      return { value: true };
    }
    if (value === 'false' || value === '0') {
      return { value: false };
    }
    return { error: 'Must be a boolean value' };
  }

  private validateUrl(value: unknown): { value?: string; error?: string } {
    if (typeof value !== 'string') {
      return { error: 'Must be a URL string' };
    }

    try {
      new URL(value);
      return { value };
    } catch {
      return { error: 'Invalid URL format' };
    }
  }

  private validateEmail(value: unknown): { value?: string; error?: string } {
    if (typeof value !== 'string') {
      return { error: 'Must be an email string' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { error: 'Invalid email format' };
    }

    return { value: value.toLowerCase() };
  }

  private validatePhone(value: unknown): { value?: string; error?: string } {
    if (typeof value !== 'string') {
      return { error: 'Must be a phone number string' };
    }

    // Basic validation - allow digits, spaces, dashes, parens, plus
    const cleanPhone = value.replace(/[\s\-\(\)\.]/g, '');
    if (!/^\+?\d{7,15}$/.test(cleanPhone)) {
      return { error: 'Invalid phone number format' };
    }

    return { value };
  }
}
