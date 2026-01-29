# Infrastructure Specification

**Version:** 2.0
**Last Updated:** January 2026
**Status:** Ready for Implementation

---

## Table of Contents

1. [Local Development Environment](#1-local-development-environment)
2. [CI/CD Pipeline](#2-cicd-pipeline)
3. [Azure Resource Configuration](#3-azure-resource-configuration)
4. [Environment Configuration](#4-environment-configuration)
5. [Monitoring & Logging](#5-monitoring--logging)
6. [Security Configuration](#6-security-configuration)
7. [Backup & Disaster Recovery](#7-backup--disaster-recovery)
8. [External Integration Infrastructure](#8-external-integration-infrastructure)
9. [External Portal Infrastructure](#9-external-portal-infrastructure)
10. [Real-time Audit Infrastructure](#10-real-time-audit-infrastructure)
11. [AI Service Scaling](#11-ai-service-scaling)
12. [Integration Marketplace Infrastructure](#12-integration-marketplace-infrastructure)

---

## 1. Local Development Environment

### 1.1 Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20.x LTS | JavaScript runtime |
| npm | 10.x | Package manager |
| Docker | 24.x | Container runtime |
| Docker Compose | 2.x | Multi-container orchestration |
| Git | 2.40+ | Version control |
| PostgreSQL Client | 15+ | Database CLI (optional) |

### 1.2 Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    container_name: ethico-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ethico_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ethico-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: ethico-elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  mailhog:
    image: mailhog/mailhog
    container_name: ethico-mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    # Access mail UI at http://localhost:8025

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:

networks:
  default:
    name: ethico-network
```

### 1.3 Database Initialization Script

```sql
-- scripts/init-db.sql

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create application role for RLS
CREATE ROLE ethico_app LOGIN PASSWORD 'ethico_app_password';

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE ethico_dev TO ethico_app;

-- Create function to set tenant context (will be replaced by migration)
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant', tenant_id, true);
END;
$$ LANGUAGE plpgsql;
```

### 1.4 Development Scripts

```json
// package.json (root)
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd apps/backend && npm run start:dev",
    "dev:frontend": "cd apps/frontend && npm run dev",
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "cd apps/backend && npm run build",
    "build:frontend": "cd apps/frontend && npm run build",
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd apps/backend && npm run test",
    "test:frontend": "cd apps/frontend && npm run test",
    "lint": "npm run lint:backend && npm run lint:frontend",
    "lint:backend": "cd apps/backend && npm run lint",
    "lint:frontend": "cd apps/frontend && npm run lint",
    "typecheck": "npm run typecheck:backend && npm run typecheck:frontend",
    "typecheck:backend": "cd apps/backend && npm run typecheck",
    "typecheck:frontend": "cd apps/frontend && npm run typecheck",
    "db:migrate": "cd apps/backend && npx prisma migrate dev",
    "db:migrate:deploy": "cd apps/backend && npx prisma migrate deploy",
    "db:seed": "cd apps/backend && npx prisma db seed",
    "db:reset": "cd apps/backend && npx prisma migrate reset",
    "db:studio": "cd apps/backend && npx prisma studio",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "clean": "rm -rf node_modules apps/*/node_modules packages/*/node_modules"
  }
}
```

---

## 2. CI/CD Pipeline

### 2.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20.x'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ==========================================
  # JOB 1: Lint and Type Check
  # ==========================================
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript type check
        run: npm run typecheck

  # ==========================================
  # JOB 2: Unit Tests
  # ==========================================
  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Backend Unit Tests
        run: npm run test:backend -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ethico_test
          JWT_SECRET: test-secret-key

      - name: Run Frontend Unit Tests
        run: npm run test:frontend -- --coverage

      - name: Upload Coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/backend/coverage/lcov.info,./apps/frontend/coverage/lcov.info

  # ==========================================
  # JOB 3: Integration Tests
  # ==========================================
  test-integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: lint

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: ethico_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: cd apps/backend && npx prisma generate

      - name: Run Migrations
        run: cd apps/backend && npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ethico_test

      - name: Seed Test Data
        run: cd apps/backend && npx prisma db seed
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ethico_test

      - name: Run Integration Tests
        run: cd apps/backend && npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ethico_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret-key

  # ==========================================
  # JOB 4: Build
  # ==========================================
  build:
    name: Build Applications
    runs-on: ubuntu-latest
    needs: [test-unit, test-integration]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Backend
        run: npm run build:backend

      - name: Build Frontend
        run: npm run build:frontend

      - name: Upload Backend Build Artifact
        uses: actions/upload-artifact@v4
        with:
          name: backend-dist
          path: apps/backend/dist

      - name: Upload Frontend Build Artifact
        uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: apps/frontend/dist

  # ==========================================
  # JOB 5: Build Docker Images
  # ==========================================
  docker:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop')
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=

      - name: Build and push Backend image
        uses: docker/build-push-action@v5
        with:
          context: ./apps/backend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ github.sha }}
          labels: ${{ steps.meta.outputs.labels }}

      - name: Build and push Frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./apps/frontend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ github.sha }}
          labels: ${{ steps.meta.outputs.labels }}

  # ==========================================
  # JOB 6: Deploy to Staging
  # ==========================================
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: docker
    if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Azure App Service (Backend)
        uses: azure/webapps-deploy@v2
        with:
          app-name: ethico-staging-api
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ github.sha }}

      - name: Deploy to Azure Static Web Apps (Frontend)
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_TOKEN_STAGING }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "apps/frontend/dist"

  # ==========================================
  # JOB 7: Deploy to Production
  # ==========================================
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: docker
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Azure App Service (Backend)
        uses: azure/webapps-deploy@v2
        with:
          app-name: ethico-prod-api
          slot-name: staging  # Deploy to staging slot first
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ github.sha }}

      - name: Run Production Migrations
        run: |
          az webapp config appsettings set --name ethico-prod-api --slot staging \
            --settings RUN_MIGRATIONS=true

      - name: Swap Slots
        run: |
          az webapp deployment slot swap --name ethico-prod-api \
            --slot staging --target-slot production

      - name: Deploy to Azure Static Web Apps (Frontend)
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_TOKEN_PROD }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "apps/frontend/dist"
```

### 2.2 Deployment Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CI/CD Pipeline                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Push to Branch                                                              │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────┐                                                             │
│  │    Lint     │                                                             │
│  │ + TypeCheck │                                                             │
│  └──────┬──────┘                                                             │
│         │                                                                    │
│    ┌────┴────┐                                                               │
│    ▼         ▼                                                               │
│ ┌──────┐ ┌───────────────┐                                                   │
│ │ Unit │ │ Integration   │                                                   │
│ │ Tests│ │ Tests         │                                                   │
│ └──┬───┘ └───────┬───────┘                                                   │
│    │             │                                                           │
│    └──────┬──────┘                                                           │
│           ▼                                                                  │
│    ┌──────────────┐                                                          │
│    │    Build     │                                                          │
│    │  (Artifacts) │                                                          │
│    └──────┬───────┘                                                          │
│           │                                                                  │
│           ▼                                                                  │
│    ┌──────────────┐                                                          │
│    │ Docker Build │                                                          │
│    │  & Push      │                                                          │
│    └──────┬───────┘                                                          │
│           │                                                                  │
│     ┌─────┴─────┐                                                            │
│     │           │                                                            │
│     ▼           ▼                                                            │
│ ┌────────┐  ┌──────────┐                                                     │
│ │develop │  │  main    │                                                     │
│ │        │  │          │                                                     │
│ └───┬────┘  └────┬─────┘                                                     │
│     │            │                                                           │
│     ▼            ▼                                                           │
│ ┌────────┐  ┌──────────┐                                                     │
│ │STAGING │  │PRODUCTION│                                                     │
│ │Deploy  │  │ Deploy   │                                                     │
│ └────────┘  └──────────┘                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Azure Resource Configuration

### 3.1 Resource Overview

| Resource | Development | Staging | Production |
|----------|-------------|---------|------------|
| App Service Plan | B1 (shared) | B2 | P1v3 |
| PostgreSQL | Local Docker | Basic (2 vCores) | GP_Gen5_4 |
| Redis Cache | Local Docker | Basic C0 | Standard C1 |
| Blob Storage | Local/Azurite | Standard LRS | Standard GRS |
| Cognitive Search | N/A | Basic | Standard S1 |
| Key Vault | N/A | Standard | Standard |

### 3.2 Terraform Configuration

```hcl
# infrastructure/main.tf

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "ethico-terraform-state"
    storage_account_name = "ethicotfstate"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US 2"
}

locals {
  prefix = "ethico-${var.environment}"
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${local.prefix}-rg"
  location = var.location
}

# App Service Plan
resource "azurerm_service_plan" "main" {
  name                = "${local.prefix}-asp"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = var.environment == "production" ? "P1v3" : "B2"
}

# PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${local.prefix}-psql"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = "15"
  administrator_login    = "ethico_admin"
  administrator_password = var.db_password
  storage_mb             = var.environment == "production" ? 131072 : 32768
  sku_name               = var.environment == "production" ? "GP_Standard_D4s_v3" : "B_Standard_B2s"

  high_availability {
    mode = var.environment == "production" ? "ZoneRedundant" : "Disabled"
  }
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "ethico"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Redis Cache
resource "azurerm_redis_cache" "main" {
  name                = "${local.prefix}-redis"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  capacity            = var.environment == "production" ? 1 : 0
  family              = var.environment == "production" ? "C" : "C"
  sku_name            = var.environment == "production" ? "Standard" : "Basic"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
}

# Storage Account (for Blob Storage)
resource "azurerm_storage_account" "main" {
  name                     = replace("${local.prefix}storage", "-", "")
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = var.environment == "production" ? "GRS" : "LRS"
  min_tls_version          = "TLS1_2"
}

# Key Vault
resource "azurerm_key_vault" "main" {
  name                = "${local.prefix}-kv"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  soft_delete_retention_days = 90
  purge_protection_enabled   = var.environment == "production"
}

# App Service (Backend)
resource "azurerm_linux_web_app" "api" {
  name                = "${local.prefix}-api"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    application_stack {
      docker_image     = "ghcr.io/ethico/policy-management-backend"
      docker_image_tag = "latest"
    }

    health_check_path = "/api/health"

    cors {
      allowed_origins = var.environment == "production"
        ? ["https://app.ethico.com"]
        : ["https://staging.ethico.com", "http://localhost:5173"]
    }
  }

  app_settings = {
    DATABASE_URL                  = "postgresql://${azurerm_postgresql_flexible_server.main.administrator_login}:${var.db_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/ethico?sslmode=require"
    REDIS_URL                     = "rediss://:${azurerm_redis_cache.main.primary_access_key}@${azurerm_redis_cache.main.hostname}:6380"
    JWT_SECRET                    = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.main.vault_uri}secrets/jwt-secret)"
    AZURE_STORAGE_CONNECTION_STRING = azurerm_storage_account.main.primary_connection_string
    NODE_ENV                      = var.environment
  }

  identity {
    type = "SystemAssigned"
  }
}

# Static Web App (Frontend)
resource "azurerm_static_web_app" "frontend" {
  name                = "${local.prefix}-web"
  resource_group_name = azurerm_resource_group.main.name
  location            = "Central US"  # Static Web Apps have limited regions
  sku_tier            = "Standard"
  sku_size            = "Standard"
}
```

### 3.3 Azure Cognitive Search Index

```json
{
  "name": "policies",
  "fields": [
    { "name": "id", "type": "Edm.String", "key": true, "searchable": false },
    { "name": "tenantId", "type": "Edm.String", "filterable": true, "searchable": false },
    { "name": "title", "type": "Edm.String", "searchable": true, "analyzer": "en.lucene" },
    { "name": "content", "type": "Edm.String", "searchable": true, "analyzer": "en.lucene" },
    { "name": "policyType", "type": "Edm.String", "filterable": true, "facetable": true },
    { "name": "status", "type": "Edm.String", "filterable": true, "facetable": true },
    { "name": "businessFunction", "type": "Edm.String", "filterable": true, "facetable": true },
    { "name": "locations", "type": "Collection(Edm.String)", "filterable": true, "facetable": true },
    { "name": "customTags", "type": "Collection(Edm.String)", "filterable": true, "facetable": true },
    { "name": "ownerId", "type": "Edm.String", "filterable": true },
    { "name": "ownerName", "type": "Edm.String", "searchable": true },
    { "name": "createdAt", "type": "Edm.DateTimeOffset", "filterable": true, "sortable": true },
    { "name": "updatedAt", "type": "Edm.DateTimeOffset", "filterable": true, "sortable": true }
  ],
  "suggesters": [
    {
      "name": "sg",
      "searchMode": "analyzingInfixMatching",
      "sourceFields": ["title", "customTags"]
    }
  ],
  "scoringProfiles": [
    {
      "name": "boostTitle",
      "text": {
        "weights": {
          "title": 2.0,
          "content": 1.0
        }
      }
    }
  ]
}
```

---

## 4. Environment Configuration

### 4.1 Environment Variables Template

```bash
# .env.example

# ====================
# Application
# ====================
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# ====================
# Database
# ====================
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ethico_dev

# ====================
# Redis
# ====================
REDIS_URL=redis://localhost:6379

# ====================
# Authentication
# ====================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ====================
# Microsoft Azure AD SSO
# ====================
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=common
AZURE_REDIRECT_URI=http://localhost:3000/api/v1/auth/microsoft/callback

# ====================
# Google OAuth
# ====================
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback

# ====================
# Email (SMTP)
# ====================
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@ethico.com

# ====================
# Azure Storage
# ====================
AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true
AZURE_STORAGE_CONTAINER_PREFIX=tenant-

# ====================
# Azure Cognitive Search
# ====================
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_API_KEY=your-search-api-key
AZURE_SEARCH_INDEX_PREFIX=tenant_

# ====================
# AI (Anthropic Claude)
# ====================
ANTHROPIC_API_KEY=your-anthropic-api-key
AI_MODEL=claude-3-sonnet-20240229
AI_MAX_TOKENS=4096
AI_RATE_LIMIT_PER_MINUTE=10

# ====================
# Logging
# ====================
LOG_LEVEL=debug
LOG_FORMAT=pretty

# ====================
# Feature Flags
# ====================
FEATURE_AI_GENERATION=true
FEATURE_REALTIME_COLLAB=true
FEATURE_EMAIL_APPROVAL=true
```

### 4.2 Environment-Specific Values

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `NODE_ENV` | development | staging | production |
| `LOG_LEVEL` | debug | info | warn |
| `LOG_FORMAT` | pretty | json | json |
| `JWT_ACCESS_EXPIRY` | 15m | 15m | 15m |
| `JWT_REFRESH_EXPIRY` | 7d | 7d | 7d |
| `AI_RATE_LIMIT_PER_MINUTE` | 100 | 30 | 10 |

---

## 5. Monitoring & Logging

### 5.1 Application Insights Configuration

```typescript
// apps/backend/src/common/logging/app-insights.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import * as appInsights from 'applicationinsights';

@Injectable()
export class AppInsightsService implements OnModuleInit {
  onModuleInit() {
    if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
      appInsights
        .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true, true)
        .setSendLiveMetrics(true)
        .start();
    }
  }
}
```

### 5.2 Structured Logging

```typescript
// apps/backend/src/common/logging/logger.service.ts

import { Injectable, LoggerService } from '@nestjs/common';
import * as pino from 'pino';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.LOG_FORMAT === 'pretty'
        ? { target: 'pino-pretty' }
        : undefined,
      formatters: {
        level: (label) => ({ level: label }),
      },
      base: {
        service: 'ethico-api',
        environment: process.env.NODE_ENV,
      },
    });
  }

  log(message: string, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: string, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: string, context?: string) {
    this.logger.debug({ context }, message);
  }
}
```

### 5.3 Health Check Endpoint

```typescript
// apps/backend/src/health/health.controller.ts

import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller('api/health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private prisma: PrismaHealthIndicator,
    private prismaService: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prisma.pingCheck('database', this.prismaService),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prisma.pingCheck('database', this.prismaService),
      // Add Redis, Elasticsearch checks
    ]);
  }

  @Get('live')
  liveness() {
    return { status: 'ok' };
  }
}
```

---

## 6. Security Configuration

### 6.1 Helmet Configuration

```typescript
// apps/backend/src/main.ts

import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));

  await app.listen(process.env.PORT || 3000);
}
```

### 6.2 Rate Limiting

```typescript
// apps/backend/src/common/guards/rate-limit.guard.ts

import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    // Rate limit by tenant + IP for better isolation
    const tenantId = req.user?.tenantId || 'anonymous';
    const ip = req.ip;
    return Promise.resolve(`${tenantId}:${ip}`);
  }
}

// Configuration in app.module.ts
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1000, // 1 second
    limit: 10, // 10 requests per second
  },
  {
    name: 'medium',
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute
  },
  {
    name: 'long',
    ttl: 3600000, // 1 hour
    limit: 1000, // 1000 requests per hour
  },
]);
```

---

## 7. Backup & Disaster Recovery

### 7.1 Database Backup Strategy

| Environment | Backup Type | Frequency | Retention |
|-------------|-------------|-----------|-----------|
| Development | None | N/A | N/A |
| Staging | Auto (Azure) | Daily | 7 days |
| Production | Auto (Azure) | Continuous | 35 days |
| Production | Geo-redundant | Daily | 90 days |

### 7.2 Recovery Procedures

```bash
# Point-in-time restore (Azure PostgreSQL)
az postgres flexible-server restore \
  --resource-group ethico-prod-rg \
  --name ethico-prod-psql-restored \
  --source-server ethico-prod-psql \
  --restore-time "2026-01-15T10:00:00Z"

# Blob storage recovery
az storage blob restore \
  --account-name ethicoprodstorage \
  --time-to-restore "2026-01-15T10:00:00Z" \
  --blob-range container1 "" container1 "zzz"
```

### 7.3 Disaster Recovery Objectives

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | 4 hours |
| RPO (Recovery Point Objective) | 1 hour |
| MTTR (Mean Time to Recovery) | 2 hours |

---

## 8. External Integration Infrastructure

### 8.1 SharePoint Integration

#### 8.1.1 Microsoft Graph API Configuration

```typescript
// apps/backend/src/config/microsoft-graph.config.ts

export interface MicrosoftGraphConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  scopes: string[];
}

export const microsoftGraphConfig: MicrosoftGraphConfig = {
  clientId: process.env.MICROSOFT_GRAPH_CLIENT_ID!,
  clientSecret: process.env.MICROSOFT_GRAPH_CLIENT_SECRET!,
  tenantId: process.env.MICROSOFT_GRAPH_TENANT_ID || 'common',
  scopes: [
    'https://graph.microsoft.com/.default',
    'Sites.Read.All',
    'Sites.ReadWrite.All',
    'Files.Read.All',
    'Files.ReadWrite.All',
  ],
};
```

#### 8.1.2 SharePoint Search Plugin Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SharePoint Search Integration                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐     ┌─────────────────┐     ┌─────────────────────┐     │
│  │  SharePoint    │     │   Azure App     │     │   Ethico Backend    │     │
│  │  Search Box    │────▶│  Registration   │────▶│   Search API        │     │
│  └────────────────┘     └─────────────────┘     └─────────────────────┘     │
│         │                       │                        │                   │
│         ▼                       ▼                        ▼                   │
│  ┌────────────────┐     ┌─────────────────┐     ┌─────────────────────┐     │
│  │  Microsoft     │     │   OAuth 2.0     │     │   Policy Search     │     │
│  │  Search API    │     │   Token Flow    │     │   Results           │     │
│  └────────────────┘     └─────────────────┘     └─────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 8.1.3 SharePoint Connector Terraform

```hcl
# infrastructure/sharepoint.tf

# Azure AD Application for SharePoint Integration
resource "azuread_application" "sharepoint_connector" {
  display_name = "${local.prefix}-sharepoint-connector"

  api {
    requested_access_token_version = 2
  }

  required_resource_access {
    resource_app_id = "00000003-0000-0ff1-ce00-000000000000" # SharePoint

    resource_access {
      id   = "678536fe-1083-478a-9c59-b99265e6b0d3" # Sites.Read.All
      type = "Role"
    }
    resource_access {
      id   = "9492366f-7969-46a4-8d15-ed1a20078fff" # Sites.ReadWrite.All
      type = "Role"
    }
  }

  required_resource_access {
    resource_app_id = "00000003-0000-0000-c000-000000000000" # Microsoft Graph

    resource_access {
      id   = "01d4889c-1287-42c6-ac1f-5d1e02578ef6" # Files.Read.All
      type = "Role"
    }
  }

  web {
    redirect_uris = [
      "${azurerm_linux_web_app.api.default_hostname}/api/v1/integrations/sharepoint/callback"
    ]
  }
}

resource "azuread_service_principal" "sharepoint_connector" {
  client_id = azuread_application.sharepoint_connector.client_id
}

resource "azuread_application_password" "sharepoint_connector" {
  application_id = azuread_application.sharepoint_connector.id
  display_name   = "SharePoint Connector Secret"
  end_date       = "2027-01-01T00:00:00Z"
}
```

### 8.2 LMS Integration

#### 8.2.1 LMS Adapter Configuration

```typescript
// apps/backend/src/config/lms.config.ts

export interface LMSIntegrationConfig {
  type: 'scorm' | 'xapi' | 'lti' | 'api';
  endpoints: {
    launch: string;
    completion: string;
    grades: string;
    content: string;
  };
  credentials: {
    clientId: string;
    clientSecret: string;
    apiKey?: string;
  };
}

export const supportedLMSProviders = [
  'cornerstone',
  'successfactors',
  'workday_learning',
  'docebo',
  'absorb',
  'moodle',
  'custom_lti'
];
```

#### 8.2.2 xAPI Learning Record Store (LRS)

```yaml
# docker-compose.lms.yml - Local LRS for testing

services:
  lrs:
    image: yetanalytics/lrs:latest
    container_name: ethico-lrs
    environment:
      - LRSQL_API_KEY_DEFAULT=ethico-dev-key
      - LRSQL_ADMIN_USER_DEFAULT=admin
      - LRSQL_ADMIN_PASS_DEFAULT=admin123
    ports:
      - "8080:8080"
    volumes:
      - lrs_data:/lrs/data

volumes:
  lrs_data:
```

#### 8.2.3 LTI 1.3 Configuration

```typescript
// apps/backend/src/modules/lms/lti/lti-platform.config.ts

export interface LTIPlatformConfig {
  issuer: string;
  clientId: string;
  deploymentId: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksEndpoint: string;
  publicKeysetUrl: string;
}

export const ltiConfig = {
  // Ethico as LTI Tool
  toolConfig: {
    issuer: process.env.LTI_ISSUER || 'https://app.ethico.com',
    clientId: process.env.LTI_CLIENT_ID!,
    authenticationEndpoint: '/api/v1/lti/auth',
    targetLinkUri: '/api/v1/lti/launch',
    jwksUri: '/api/v1/lti/.well-known/jwks.json',
  },

  // Supported message types
  messageTypes: [
    'LtiResourceLinkRequest',
    'LtiDeepLinkingRequest',
  ],

  // Supported services
  services: {
    assignmentAndGrades: true,
    namesAndRoles: true,
    deepLinking: true,
  },
};
```

### 8.3 MyCM/Risk System Integration

#### 8.3.1 Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   MyCM / Risk System Integration                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐                           ┌─────────────────────┐     │
│  │   MyCM System    │◀──── REST API Sync ──────▶│   Ethico Backend    │     │
│  │                  │                           │                     │     │
│  │  ┌────────────┐  │                           │  ┌───────────────┐  │     │
│  │  │   Cases    │  │                           │  │   Policies    │  │     │
│  │  ├────────────┤  │                           │  ├───────────────┤  │     │
│  │  │   Risks    │  │◀── Webhook Notifications ─│  │  Policy Links │  │     │
│  │  ├────────────┤  │                           │  ├───────────────┤  │     │
│  │  │ Incidents  │  │                           │  │  Analytics    │  │     │
│  │  └────────────┘  │                           │  └───────────────┘  │     │
│  └──────────────────┘                           └─────────────────────┘     │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Azure Service Bus                             │   │
│  │     ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐     │   │
│  │     │ case.created │  │ risk.updated │  │ policy.linked        │     │   │
│  │     └──────────────┘  └──────────────┘  └──────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 8.3.2 Azure Service Bus Configuration

```hcl
# infrastructure/servicebus.tf

resource "azurerm_servicebus_namespace" "main" {
  name                = "${local.prefix}-servicebus"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = var.environment == "production" ? "Standard" : "Basic"
}

resource "azurerm_servicebus_topic" "policy_events" {
  name         = "policy-events"
  namespace_id = azurerm_servicebus_namespace.main.id

  default_message_ttl = "P14D" # 14 days
  max_size_in_megabytes = 1024
}

resource "azurerm_servicebus_subscription" "mycm_subscriber" {
  name               = "mycm-integration"
  topic_id           = azurerm_servicebus_topic.policy_events.id
  max_delivery_count = 10
}

resource "azurerm_servicebus_topic" "risk_events" {
  name         = "risk-events"
  namespace_id = azurerm_servicebus_namespace.main.id
}

resource "azurerm_servicebus_subscription" "policy_subscriber" {
  name               = "policy-integration"
  topic_id           = azurerm_servicebus_topic.risk_events.id
  max_delivery_count = 10
}
```

#### 8.3.3 Integration Environment Variables

```bash
# .env additions for external integrations

# ====================
# SharePoint Integration
# ====================
MICROSOFT_GRAPH_CLIENT_ID=your-sharepoint-app-client-id
MICROSOFT_GRAPH_CLIENT_SECRET=your-sharepoint-app-client-secret
MICROSOFT_GRAPH_TENANT_ID=your-azure-tenant-id
SHAREPOINT_SITE_URL=https://yourtenant.sharepoint.com/sites/policies

# ====================
# LMS Integration
# ====================
LTI_ISSUER=https://app.ethico.com
LTI_CLIENT_ID=your-lti-client-id
LTI_CLIENT_SECRET=your-lti-client-secret
LTI_PRIVATE_KEY_PATH=/secrets/lti-private-key.pem
XAPI_ENDPOINT=https://lrs.ethico.com/xAPI
XAPI_USERNAME=ethico-xapi-client
XAPI_PASSWORD=your-xapi-password

# ====================
# MyCM Integration
# ====================
MYCM_API_URL=https://mycm.yourcompany.com/api
MYCM_API_KEY=your-mycm-api-key
AZURE_SERVICEBUS_CONNECTION_STRING=your-servicebus-connection-string

# ====================
# Risk System Integration
# ====================
RISK_SYSTEM_API_URL=https://risk.yourcompany.com/api
RISK_SYSTEM_API_KEY=your-risk-api-key
RISK_WEBHOOK_SECRET=your-webhook-signing-secret
```

---

## 9. External Portal Infrastructure

### 9.1 Portal Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      External Portal Architecture                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Internet                                                                    │
│     │                                                                        │
│     ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     Azure Front Door                                  │   │
│  │  ┌──────────────┐  ┌──────────────────┐  ┌────────────────────────┐  │   │
│  │  │  app.ethico  │  │  portal.ethico   │  │  {tenant}.portal.ethico│  │   │
│  │  └──────────────┘  └──────────────────┘  └────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│     │                        │                        │                      │
│     ▼                        ▼                        ▼                      │
│  ┌──────────────┐    ┌──────────────────┐    ┌────────────────────────┐     │
│  │  Main App    │    │  Portal Static   │    │   Portal API           │     │
│  │  (Internal)  │    │  Web App         │    │   (Limited Scope)      │     │
│  └──────────────┘    └──────────────────┘    └────────────────────────┘     │
│                              │                        │                      │
│                              ▼                        ▼                      │
│                      ┌───────────────────────────────────────┐              │
│                      │         Portal Database               │              │
│                      │    (Isolated from main tenant DB)     │              │
│                      └───────────────────────────────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Portal Static Web App Configuration

```hcl
# infrastructure/external-portal.tf

resource "azurerm_static_web_app" "portal" {
  name                = "${local.prefix}-portal"
  resource_group_name = azurerm_resource_group.main.name
  location            = "Central US"
  sku_tier            = "Standard"
  sku_size            = "Standard"
}

# Custom domain for portal
resource "azurerm_static_web_app_custom_domain" "portal" {
  static_web_app_id = azurerm_static_web_app.portal.id
  domain_name       = "portal.${var.domain}"
  validation_type   = "cname-delegation"
}
```

### 9.3 Magic Link Authentication Infrastructure

#### 9.3.1 Token Storage (Redis)

```typescript
// apps/backend/src/modules/portal/auth/magic-link.service.ts

export interface MagicLinkToken {
  token: string;
  email: string;
  portalId: string;
  tenantId: string;
  expiresAt: Date;
  permissions: PortalPermission[];
  metadata: {
    ipAddress: string;
    userAgent: string;
    createdAt: Date;
  };
}

// Redis key pattern: magic_link:{token}
// TTL: 24 hours (configurable per tenant)
```

#### 9.3.2 Portal Session Management

```hcl
# infrastructure/portal-redis.tf

resource "azurerm_redis_cache" "portal" {
  name                = "${local.prefix}-portal-redis"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  capacity            = 0
  family              = "C"
  sku_name            = var.environment == "production" ? "Standard" : "Basic"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_policy = "volatile-lru"
  }
}
```

### 9.4 Portal Security Configuration

```typescript
// apps/backend/src/modules/portal/portal-security.config.ts

export const portalSecurityConfig = {
  // Rate limiting for portal API
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
  },

  // Magic link configuration
  magicLink: {
    tokenLength: 64, // bytes
    expirationHours: 24,
    maxActiveLinksPerEmail: 3,
    cooldownMinutes: 1, // Between link requests
  },

  // Session configuration
  session: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    renewalThreshold: 24 * 60 * 60 * 1000, // Renew if < 24 hours left
  },

  // IP allowlisting (optional per tenant)
  ipAllowlist: {
    enabled: false,
    ranges: [],
  },

  // Content access restrictions
  contentAccess: {
    maxDownloadsPerSession: 50,
    watermarkEnabled: true,
    preventCopy: false,
  },
};
```

### 9.5 Portal Environment Variables

```bash
# .env additions for external portal

# ====================
# External Portal
# ====================
PORTAL_BASE_URL=https://portal.ethico.com
PORTAL_API_URL=https://api.ethico.com/portal
PORTAL_REDIS_URL=redis://portal-redis:6379
PORTAL_SESSION_SECRET=your-portal-session-secret
PORTAL_MAGIC_LINK_SECRET=your-magic-link-signing-secret
PORTAL_ALLOWED_ORIGINS=https://portal.ethico.com,https://*.portal.ethico.com
```

---

## 10. Real-time Audit Infrastructure

### 10.1 WebSocket Streaming Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Real-time Audit Dashboard Architecture                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Data Sources                                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │ Policy   │ │ Workflow │ │Attestation│ │Exception │ │  User    │    │  │
│  │  │ Events   │ │ Events   │ │ Events   │ │ Events   │ │ Events   │    │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │  │
│  └───────┼────────────┼────────────┼────────────┼────────────┼──────────┘  │
│          │            │            │            │            │             │
│          ▼            ▼            ▼            ▼            ▼             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     Azure Event Hub                                    │  │
│  │                 (Partitioned by Tenant ID)                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          ▼                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │              Azure Stream Analytics                                    │  │
│  │         (Real-time aggregation & alerting)                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│          │                        │                                         │
│          ▼                        ▼                                         │
│  ┌─────────────────┐     ┌─────────────────────┐                           │
│  │  Socket.io      │     │  Azure Cosmos DB    │                           │
│  │  (WebSocket)    │     │  (Hot Data Store)   │                           │
│  └────────┬────────┘     └─────────────────────┘                           │
│           │                                                                 │
│           ▼                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Browser Dashboard                                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐  │  │
│  │  │ Metrics  │ │ Events   │ │ Alerts   │ │ Compliance Trend Charts  │  │  │
│  │  │ Cards    │ │ Feed     │ │ Panel    │ │                          │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Azure Event Hub Configuration

```hcl
# infrastructure/eventhub.tf

resource "azurerm_eventhub_namespace" "audit" {
  name                = "${local.prefix}-audit-eventhub"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = var.environment == "production" ? "Standard" : "Basic"
  capacity            = var.environment == "production" ? 2 : 1
}

resource "azurerm_eventhub" "audit_events" {
  name                = "audit-events"
  namespace_name      = azurerm_eventhub_namespace.audit.name
  resource_group_name = azurerm_resource_group.main.name
  partition_count     = var.environment == "production" ? 8 : 2
  message_retention   = var.environment == "production" ? 7 : 1
}

resource "azurerm_eventhub_consumer_group" "dashboard" {
  name                = "dashboard-consumers"
  namespace_name      = azurerm_eventhub_namespace.audit.name
  eventhub_name       = azurerm_eventhub.audit_events.name
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_eventhub_consumer_group" "analytics" {
  name                = "analytics-consumers"
  namespace_name      = azurerm_eventhub_namespace.audit.name
  eventhub_name       = azurerm_eventhub.audit_events.name
  resource_group_name = azurerm_resource_group.main.name
}
```

### 10.3 Stream Analytics Query

```sql
-- infrastructure/stream-analytics/audit-aggregation.asaql

-- Real-time compliance metrics (5-second windows)
SELECT
    TenantId,
    System.Timestamp() AS WindowEnd,
    COUNT(*) AS TotalEvents,
    SUM(CASE WHEN EventType = 'ATTESTATION_COMPLETED' THEN 1 ELSE 0 END) AS AttestationsCompleted,
    SUM(CASE WHEN EventType = 'WORKFLOW_APPROVED' THEN 1 ELSE 0 END) AS WorkflowsApproved,
    SUM(CASE WHEN EventType = 'EXCEPTION_CREATED' THEN 1 ELSE 0 END) AS ExceptionsCreated,
    SUM(CASE WHEN Severity = 'HIGH' THEN 1 ELSE 0 END) AS HighSeverityEvents
INTO [dashboard-output]
FROM [audit-events] TIMESTAMP BY EventTimestamp
GROUP BY TenantId, TumblingWindow(second, 5)

-- Alert detection (immediate)
SELECT
    TenantId,
    EventType,
    UserId,
    ResourceId,
    EventTimestamp,
    Severity,
    'COMPLIANCE_ALERT' AS AlertType
INTO [alerts-output]
FROM [audit-events]
WHERE
    Severity = 'CRITICAL'
    OR (EventType = 'ATTESTATION_OVERDUE' AND DaysOverdue > 7)
    OR (EventType = 'EXCEPTION_EXPIRED' AND Status = 'ACTIVE')
```

### 10.4 Cosmos DB for Hot Data

```hcl
# infrastructure/cosmosdb.tf

resource "azurerm_cosmosdb_account" "audit" {
  name                = "${local.prefix}-audit-cosmos"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.main.location
    failover_priority = 0
  }

  capabilities {
    name = "EnableServerless"
  }
}

resource "azurerm_cosmosdb_sql_database" "audit" {
  name                = "audit-db"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.audit.name
}

resource "azurerm_cosmosdb_sql_container" "realtime_metrics" {
  name                = "realtime-metrics"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.audit.name
  database_name       = azurerm_cosmosdb_sql_database.audit.name
  partition_key_paths = ["/tenantId"]

  default_ttl = 86400 # 24 hours - hot data only

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/tenantId/*"
    }
    included_path {
      path = "/timestamp/*"
    }
    excluded_path {
      path = "/*"
    }
  }
}
```

### 10.5 WebSocket Server Configuration

```typescript
// apps/backend/src/modules/audit/realtime/websocket.config.ts

export const auditWebSocketConfig = {
  // Socket.io server options
  server: {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  },

  // Room naming (tenant isolation)
  rooms: {
    auditDashboard: (tenantId: string) => `audit:${tenantId}:dashboard`,
    complianceAlerts: (tenantId: string) => `audit:${tenantId}:alerts`,
    userActivity: (tenantId: string, userId: string) =>
      `audit:${tenantId}:user:${userId}`,
  },

  // Event types
  events: {
    METRICS_UPDATE: 'audit:metrics',
    COMPLIANCE_ALERT: 'audit:alert',
    EVENT_STREAM: 'audit:event',
    CONNECTION_STATUS: 'audit:status',
  },

  // Throttling (per tenant)
  throttle: {
    metricsIntervalMs: 5000, // Update metrics every 5 seconds
    maxEventsPerSecond: 100, // Cap streaming rate
    alertDebounceMs: 1000, // Debounce duplicate alerts
  },
};
```

### 10.6 Audit Environment Variables

```bash
# .env additions for real-time audit

# ====================
# Azure Event Hub
# ====================
AZURE_EVENTHUB_CONNECTION_STRING=your-eventhub-connection-string
AZURE_EVENTHUB_NAME=audit-events
AZURE_EVENTHUB_CONSUMER_GROUP=dashboard-consumers

# ====================
# Azure Cosmos DB (Hot Data)
# ====================
AZURE_COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
AZURE_COSMOS_KEY=your-cosmos-primary-key
AZURE_COSMOS_DATABASE=audit-db

# ====================
# WebSocket Configuration
# ====================
WS_PORT=3001
WS_PATH=/audit/socket
WS_CORS_ORIGIN=https://app.ethico.com
```

---

## 11. AI Service Scaling

### 11.1 AI Workload Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI Service Architecture                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       AI Request Queue                                 │  │
│  │              (Azure Queue Storage / Redis Streams)                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │ Generate │ │ AutoTag  │ │Summarize │ │  Quiz    │ │Regulatory│    │  │
│  │  │ Policy   │ │ Requests │ │ Requests │ │ Generate │ │ Mapping  │    │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │  │
│  └───────┼────────────┼────────────┼────────────┼────────────┼──────────┘  │
│          │            │            │            │            │             │
│          ▼            ▼            ▼            ▼            ▼             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     AI Worker Pool                                     │  │
│  │              (Azure Container Instances / K8s)                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │ Worker 1 │ │ Worker 2 │ │ Worker 3 │ │ Worker 4 │ │ Worker N │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          ▼                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     AI Provider Layer                                  │  │
│  │  ┌────────────────────┐        ┌────────────────────────────────────┐ │  │
│  │  │   Anthropic Claude │        │   Self-Hosted LLM                  │ │  │
│  │  │   (Primary)        │        │   (Fallback / On-Prem Option)      │ │  │
│  │  └────────────────────┘        └────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 AI Queue Configuration

```hcl
# infrastructure/ai-queue.tf

# Azure Queue Storage for AI requests
resource "azurerm_storage_queue" "ai_generation" {
  name                 = "ai-policy-generation"
  storage_account_name = azurerm_storage_account.main.name
}

resource "azurerm_storage_queue" "ai_autotag" {
  name                 = "ai-auto-tagging"
  storage_account_name = azurerm_storage_account.main.name
}

resource "azurerm_storage_queue" "ai_summarization" {
  name                 = "ai-summarization"
  storage_account_name = azurerm_storage_account.main.name
}

resource "azurerm_storage_queue" "ai_quiz" {
  name                 = "ai-quiz-generation"
  storage_account_name = azurerm_storage_account.main.name
}

resource "azurerm_storage_queue" "ai_regulatory" {
  name                 = "ai-regulatory-mapping"
  storage_account_name = azurerm_storage_account.main.name
}
```

### 11.3 AI Worker Container Configuration

```yaml
# infrastructure/ai-worker/deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-worker
  template:
    metadata:
      labels:
        app: ai-worker
    spec:
      containers:
        - name: ai-worker
          image: ghcr.io/ethico/ai-worker:latest
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
          env:
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: ai-secrets
                  key: anthropic-api-key
            - name: QUEUE_CONNECTION_STRING
              valueFrom:
                secretKeyRef:
                  name: storage-secrets
                  key: connection-string
            - name: WORKER_CONCURRENCY
              value: "5"
            - name: AI_RATE_LIMIT_PER_MINUTE
              value: "10"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-worker
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: External
      external:
        metric:
          name: azure_queue_message_count
          selector:
            matchLabels:
              queue: ai-policy-generation
        target:
          type: AverageValue
          averageValue: 100
```

### 11.4 AI Rate Limiting & Token Budgets

```typescript
// apps/backend/src/modules/ai/rate-limiting/ai-budget.service.ts

export interface TenantAIBudget {
  tenantId: string;
  monthlyTokenLimit: number;
  dailyRequestLimit: number;
  concurrentRequestLimit: number;

  // Feature-specific limits
  featureLimits: {
    policyGeneration: { daily: number; tokensPerRequest: number };
    autoTagging: { daily: number; tokensPerRequest: number };
    summarization: { daily: number; tokensPerRequest: number };
    quizGeneration: { daily: number; tokensPerRequest: number };
    regulatoryMapping: { daily: number; tokensPerRequest: number };
  };
}

export const defaultAIBudgets: Record<string, TenantAIBudget> = {
  enterprise: {
    tenantId: 'enterprise',
    monthlyTokenLimit: 10_000_000,
    dailyRequestLimit: 5000,
    concurrentRequestLimit: 20,
    featureLimits: {
      policyGeneration: { daily: 500, tokensPerRequest: 8000 },
      autoTagging: { daily: 2000, tokensPerRequest: 1000 },
      summarization: { daily: 1000, tokensPerRequest: 2000 },
      quizGeneration: { daily: 500, tokensPerRequest: 3000 },
      regulatoryMapping: { daily: 200, tokensPerRequest: 4000 },
    },
  },
  professional: {
    tenantId: 'professional',
    monthlyTokenLimit: 2_000_000,
    dailyRequestLimit: 1000,
    concurrentRequestLimit: 5,
    featureLimits: {
      policyGeneration: { daily: 100, tokensPerRequest: 8000 },
      autoTagging: { daily: 500, tokensPerRequest: 1000 },
      summarization: { daily: 200, tokensPerRequest: 2000 },
      quizGeneration: { daily: 100, tokensPerRequest: 3000 },
      regulatoryMapping: { daily: 50, tokensPerRequest: 4000 },
    },
  },
};
```

### 11.5 AI Service Environment Variables

```bash
# .env additions for AI scaling

# ====================
# AI Worker Configuration
# ====================
AI_WORKER_CONCURRENCY=5
AI_QUEUE_POLL_INTERVAL_MS=1000
AI_REQUEST_TIMEOUT_MS=120000
AI_RETRY_ATTEMPTS=3
AI_RETRY_DELAY_MS=5000

# ====================
# AI Provider Configuration
# ====================
ANTHROPIC_API_KEY=your-anthropic-api-key
AI_MODEL=claude-3-sonnet-20240229
AI_MAX_TOKENS=4096
AI_TEMPERATURE=0.7

# ====================
# Self-Hosted LLM (Optional)
# ====================
SELF_HOSTED_LLM_URL=http://llm-service:8080
SELF_HOSTED_LLM_API_KEY=your-self-hosted-key
AI_FALLBACK_ENABLED=true

# ====================
# AI Rate Limiting
# ====================
AI_RATE_LIMIT_PER_MINUTE=10
AI_MONTHLY_TOKEN_LIMIT=10000000
AI_CONCURRENT_REQUEST_LIMIT=20
```

---

## 12. Integration Marketplace Infrastructure

### 12.1 Marketplace Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Integration Marketplace Architecture                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Connector Registry                                │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │  HRIS    │ │   LMS    │ │SharePoint│ │Risk/GRC  │ │  Custom  │    │  │
│  │  │Connectors│ │Connectors│ │Connector │ │Connectors│ │Connectors│    │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │  │
│  └───────┼────────────┼────────────┼────────────┼────────────┼──────────┘  │
│          │            │            │            │            │             │
│          ▼            ▼            ▼            ▼            ▼             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     Connector Runtime                                  │  │
│  │  ┌───────────────────────────────────────────────────────────────┐   │  │
│  │  │              Connector Sandbox (Isolated Execution)            │   │  │
│  │  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────┐  │   │  │
│  │  │  │ Credential│ │   Rate    │ │  Webhook  │ │   Error       │  │   │  │
│  │  │  │  Vault    │ │  Limiter  │ │  Handler  │ │   Recovery    │  │   │  │
│  │  │  └───────────┘ └───────────┘ └───────────┘ └───────────────┘  │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          ▼                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Connector Health Dashboard                          │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────────────┐ │  │
│  │  │  Connection  │ │    Sync      │ │         Error Log              │ │  │
│  │  │   Status     │ │   History    │ │         & Alerts               │ │  │
│  │  └──────────────┘ └──────────────┘ └────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Connector Registry Database Schema

```prisma
// prisma/schema.prisma additions

model IntegrationConnector {
  id                String   @id @default(uuid())
  tenantId          String

  // Connector identity
  connectorType     String   // 'hris', 'lms', 'grc', 'custom'
  connectorId       String   // 'workday', 'bamboohr', 'cornerstone', etc.
  displayName       String
  version           String

  // Configuration
  config            Json     // Connector-specific configuration
  credentialsRef    String   // Reference to Key Vault secret

  // Status
  status            ConnectorStatus @default(INACTIVE)
  lastSyncAt        DateTime?
  lastErrorAt       DateTime?
  lastErrorMessage  String?

  // Scheduling
  syncSchedule      String?  // Cron expression
  syncEnabled       Boolean  @default(true)

  // Audit
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdBy         String

  // Relations
  tenant            Tenant   @relation(fields: [tenantId], references: [id])
  syncLogs          ConnectorSyncLog[]

  @@unique([tenantId, connectorId])
  @@index([tenantId])
  @@index([connectorType])
}

model ConnectorSyncLog {
  id              String   @id @default(uuid())
  connectorId     String

  // Sync details
  syncType        String   // 'full', 'incremental', 'webhook'
  startedAt       DateTime
  completedAt     DateTime?
  status          String   // 'running', 'success', 'failed', 'partial'

  // Metrics
  recordsProcessed Int     @default(0)
  recordsCreated   Int     @default(0)
  recordsUpdated   Int     @default(0)
  recordsDeleted   Int     @default(0)
  recordsFailed    Int     @default(0)

  // Error tracking
  errorDetails     Json?

  // Relations
  connector        IntegrationConnector @relation(fields: [connectorId], references: [id])

  @@index([connectorId])
  @@index([startedAt])
}

enum ConnectorStatus {
  INACTIVE
  ACTIVE
  SYNCING
  ERROR
  DISABLED
}
```

### 12.3 Connector Sandbox Configuration

```hcl
# infrastructure/connector-sandbox.tf

# Azure Container Apps for isolated connector execution
resource "azurerm_container_app_environment" "connectors" {
  name                = "${local.prefix}-connector-env"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
}

resource "azurerm_container_app" "connector_runner" {
  name                         = "${local.prefix}-connector-runner"
  container_app_environment_id = azurerm_container_app_environment.connectors.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  template {
    container {
      name   = "connector-runner"
      image  = "ghcr.io/ethico/connector-runner:latest"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name        = "AZURE_KEY_VAULT_URL"
        value       = azurerm_key_vault.main.vault_uri
      }

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }
    }

    min_replicas = 1
    max_replicas = 10
  }

  secret {
    name  = "database-url"
    value = "postgresql://${azurerm_postgresql_flexible_server.main.administrator_login}:${var.db_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/ethico?sslmode=require"
  }

  identity {
    type = "SystemAssigned"
  }
}
```

### 12.4 Connector Credential Management

```typescript
// apps/backend/src/modules/integrations/credentials/credential-vault.service.ts

export interface ConnectorCredentials {
  connectorId: string;
  tenantId: string;
  credentialType: 'oauth2' | 'api_key' | 'basic' | 'certificate';

  // OAuth2
  oauth2?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    tokenEndpoint: string;
    clientId: string;
    clientSecret: string;
  };

  // API Key
  apiKey?: {
    key: string;
    headerName: string;
  };

  // Basic Auth
  basic?: {
    username: string;
    password: string;
  };

  // Certificate
  certificate?: {
    certificatePem: string;
    privateKeyPem: string;
    passphrase?: string;
  };
}

// Key Vault secret naming pattern:
// connector-{tenantId}-{connectorId}-credentials
```

### 12.5 Marketplace Environment Variables

```bash
# .env additions for integration marketplace

# ====================
# Connector Runtime
# ====================
CONNECTOR_SANDBOX_ENABLED=true
CONNECTOR_EXECUTION_TIMEOUT_MS=300000
CONNECTOR_MAX_RETRIES=3
CONNECTOR_RETRY_DELAY_MS=5000

# ====================
# Connector Registry
# ====================
CONNECTOR_REGISTRY_URL=https://registry.ethico.com/connectors
CONNECTOR_AUTO_UPDATE=false

# ====================
# Credential Vault
# ====================
AZURE_KEY_VAULT_URL=https://ethico-prod-kv.vault.azure.net/
CONNECTOR_CREDENTIAL_ROTATION_DAYS=90

# ====================
# Sync Scheduling
# ====================
CONNECTOR_DEFAULT_SYNC_CRON=0 2 * * *
CONNECTOR_MAX_CONCURRENT_SYNCS=5
```

---

## Appendix: Quick Commands

```bash
# Local Development
npm run docker:up          # Start local services
npm run dev                # Start dev servers
npm run db:migrate         # Run migrations
npm run db:seed            # Seed data
npm run db:studio          # Open Prisma Studio

# Testing
npm run test               # Run all tests
npm run test:backend       # Backend tests only
npm run test:frontend      # Frontend tests only

# Deployment
npm run build              # Build all apps
docker-compose build       # Build Docker images

# Database Management
npm run db:reset           # Reset and re-seed database
npx prisma migrate deploy  # Deploy migrations (CI/CD)
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2025 | Platform Team | Initial infrastructure specification |
| 2.0 | January 2026 | Platform Team | Added external integration infrastructure (SharePoint, LMS, MyCM), external portal infrastructure with magic link auth, real-time audit dashboard with Event Hub and Cosmos DB, AI service scaling with worker pools and rate limiting, integration marketplace with connector sandbox |
