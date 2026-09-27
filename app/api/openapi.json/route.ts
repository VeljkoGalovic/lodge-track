import { NextResponse } from "next/server"

/**
 * GET /api/openapi.json
 * Returns the OpenAPI 3.0 specification for the LodgeTrack API.
 */
export async function GET() {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "LodgeTrack API",
      version: "1.0.0",
      description:
        "API for managing properties, bookings, expenses, and organization settings in LodgeTrack.",
      contact: {
        name: "LodgeTrack Support",
        email: "support@lodgetrack.app",
      },
    },
    servers: [
      {
        url: "/api",
        description: "Current server",
      },
    ],
    tags: [
      { name: "Authentication", description: "Authentication endpoints via NextAuth.js" },
      { name: "Properties", description: "Property management (v1)" },
      { name: "Bookings", description: "Booking management via server actions" },
      { name: "Usage", description: "Usage metrics and limits (v1)" },
      { name: "Billing", description: "Subscription and billing management" },
      { name: "Receipts", description: "Expense receipt upload and management" },
      { name: "Attachments", description: "File attachment management" },
      { name: "API Keys", description: "API key management for integrations" },
    ],
    paths: {
      "/auth/[...nextauth]": {
        post: {
          tags: ["Authentication"],
          summary: "NextAuth.js authentication endpoints",
          description:
            "Handles sign in, sign out, session, and provider callbacks. Supports email/password and OAuth providers.",
          operationId: "nextAuth",
          requestBody: {
            description: "Varies by action (signin, callback, etc.)",
            required: true,
            content: {
              "application/json": {
                schema: { type: "object" },
              },
              "application/x-www-form-urlencoded": {
                schema: { type: "object" },
              },
            },
          },
          responses: {
            "200": {
              description: "Authentication response (session, redirect, or callback result)",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
            "302": {
              description: "Redirect to provider or callback URL",
            },
            "400": {
              description: "Bad request",
            },
            "401": {
              description: "Unauthorized",
            },
          },
        },
        get: {
          tags: ["Authentication"],
          summary: "NextAuth.js session and provider endpoints",
          operationId: "nextAuthGet",
          responses: {
            "200": {
              description: "Session data or provider configuration",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
            "302": {
              description: "Redirect to provider",
            },
          },
        },
      },

      "/v1/properties": {
        get: {
          tags: ["Properties"],
          summary: "List properties",
          description:
            "Returns a paginated list of properties for the authenticated organization. Supports filtering, sorting, and cursor-based pagination.",
          operationId: "listProperties",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "cursor",
              in: "query",
              description: "Cursor for pagination (property ID)",
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              description: "Maximum number of properties to return (default: 20, max: 100)",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            },
            {
              name: "search",
              in: "query",
              description: "Search properties by name or address",
              schema: { type: "string" },
            },
            {
              name: "sort",
              in: "query",
              description: "Sort field (name, createdAt, updatedAt)",
              schema: { type: "string", enum: ["name", "createdAt", "updatedAt"] },
            },
            {
              name: "order",
              in: "query",
              description: "Sort order",
              schema: { type: "string", enum: ["asc", "desc"], default: "asc" },
            },
          ],
          responses: {
            "200": {
              description: "Paginated list of properties",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      properties: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Property" },
                      },
                      nextCursor: {
                        type: "string",
                        nullable: true,
                        description: "Cursor for next page, null if no more results",
                      },
                    },
                    required: ["properties", "nextCursor"],
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized - valid session required",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden - insufficient permissions",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
        post: {
          tags: ["Properties"],
          summary: "Create a property",
          description:
            "Creates a new property for the authenticated organization. Requires MANAGER or OWNER role.",
          operationId: "createProperty",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PropertyCreateInput" },
              },
            },
          },
          responses: {
            "201": {
              description: "Property created successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Property" },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden - insufficient permissions or limit reached",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/v1/properties/{id}": {
        get: {
          tags: ["Properties"],
          summary: "Get a property by ID",
          description:
            "Returns a single property with its units and booking counts. Requires organization membership.",
          operationId: "getProperty",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Property ID",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Property details with units",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PropertyWithUnits" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Property not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
        patch: {
          tags: ["Properties"],
          summary: "Update a property",
          description:
            "Updates an existing property. Requires MANAGER or OWNER role.",
          operationId: "updateProperty",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Property ID",
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PropertyUpdateInput" },
              },
            },
          },
          responses: {
            "200": {
              description: "Property updated successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Property" },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden - insufficient permissions",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Property not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
        delete: {
          tags: ["Properties"],
          summary: "Delete a property",
          description:
            "Deletes a property and all its associated data (units, bookings, expenses, attachments). Requires OWNER role. This action is irreversible.",
          operationId: "deleteProperty",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Property ID",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Property deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean", example: true },
                      deletedBookingCount: { type: "integer", example: 5 },
                    },
                    required: ["ok", "deletedBookingCount"],
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden - requires OWNER role",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Property not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "409": {
              description: "Conflict - concurrent modification, retry required",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/v1/usage": {
        get: {
          tags: ["Usage"],
          summary: "Get organization usage metrics",
          description:
            "Returns current usage statistics for the authenticated organization including property count, unit count, storage usage, and subscription tier limits.",
          operationId: "getUsage",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": {
              description: "Usage metrics",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UsageMetrics" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/billing/checkout": {
        post: {
          tags: ["Billing"],
          summary: "Create checkout session",
          description:
            "Creates a Stripe checkout session for subscription upgrades or changes.",
          operationId: "createCheckoutSession",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    priceId: { type: "string", description: "Stripe price ID" },
                    mode: { type: "string", enum: ["subscription", "payment"], default: "subscription" },
                  },
                  required: ["priceId"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Checkout session created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      url: { type: "string", format: "uri" },
                    },
                    required: ["url"],
                  },
                },
              },
            },
            "400": {
              description: "Invalid request",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/billing/portal": {
        post: {
          tags: ["Billing"],
          summary: "Create billing portal session",
          description:
            "Creates a Stripe billing portal session for managing subscriptions, payment methods, and invoices.",
          operationId: "createPortalSession",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": {
              description: "Portal session created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      url: { type: "string", format: "uri" },
                    },
                    required: ["url"],
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/billing/webhook": {
        post: {
          tags: ["Billing"],
          summary: "Stripe webhook handler",
          description:
            "Handles Stripe webhook events for subscription lifecycle, payments, and invoice events. This endpoint is called by Stripe, not directly by clients.",
          operationId: "stripeWebhook",
          requestBody: {
            required: true,
            description: "Stripe event payload",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
          responses: {
            "200": {
              description: "Webhook processed successfully",
            },
            "400": {
              description: "Invalid signature or payload",
            },
          },
        },
      },

      "/receipts": {
        post: {
          tags: ["Receipts"],
          summary: "Upload expense receipt",
          description:
            "Uploads a receipt file for an expense. Supports image and PDF files. Maximum file size: 10MB.",
          operationId: "uploadReceipt",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    file: {
                      type: "string",
                      format: "binary",
                      description: "Receipt file (image or PDF, max 10MB)",
                    },
                    expenseId: {
                      type: "string",
                      description: "Optional expense ID to associate the receipt with",
                    },
                  },
                  required: ["file"],
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Receipt uploaded successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Receipt" },
                },
              },
            },
            "400": {
              description: "Invalid file or request",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "413": {
              description: "File too large",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/receipts/{id}": {
        get: {
          tags: ["Receipts"],
          summary: "Get receipt by ID",
          description:
            "Returns receipt metadata and a signed URL for downloading the file.",
          operationId: "getReceipt",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Receipt ID",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Receipt details with download URL",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ReceiptWithUrl" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Receipt not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
        delete: {
          tags: ["Receipts"],
          summary: "Delete a receipt",
          description: "Deletes a receipt file and its metadata.",
          operationId: "deleteReceipt",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Receipt ID",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Receipt deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean", example: true },
                    },
                    required: ["ok"],
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Receipt not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/attachments": {
        post: {
          tags: ["Attachments"],
          summary: "Upload attachment",
          description:
            "Uploads a file attachment for a property, unit, booking, or expense. Supports various file types. Maximum file size: 25MB.",
          operationId: "uploadAttachment",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    file: {
                      type: "string",
                      format: "binary",
                      description: "Attachment file (max 25MB)",
                    },
                    entityType: {
                      type: "string",
                      enum: ["property", "unit", "booking", "expense"],
                      description: "Type of entity to attach to",
                    },
                    entityId: {
                      type: "string",
                      description: "ID of the entity to attach to",
                    },
                  },
                  required: ["file", "entityType", "entityId"],
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Attachment uploaded successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Attachment" },
                },
              },
            },
            "400": {
              description: "Invalid file or request",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "413": {
              description: "File too large",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/attachments/{id}": {
        get: {
          tags: ["Attachments"],
          summary: "Get attachment by ID",
          description: "Returns attachment metadata and a signed URL for downloading the file.",
          operationId: "getAttachment",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Attachment ID",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Attachment details with download URL",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AttachmentWithUrl" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Attachment not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
        delete: {
          tags: ["Attachments"],
          summary: "Delete an attachment",
          description: "Deletes an attachment file and its metadata.",
          operationId: "deleteAttachment",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Attachment ID",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Attachment deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean", example: true },
                    },
                    required: ["ok"],
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Attachment not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/actions/create-api-key": {
        post: {
          tags: ["API Keys"],
          summary: "Create an API key",
          description:
            "Creates a new API key for the organization. Only available for organizations with Enterprise tier or higher (hasApiAccess: true). Returns the raw key only once.",
          operationId: "createApiKey",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Name for the API key" },
                    isLive: { type: "boolean", default: true, description: "Whether this is a live (production) key" },
                  },
                  required: ["name"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "API key created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean", example: true },
                      rawKey: { type: "string", description: "The raw API key (only shown once)" },
                      key: { $ref: "#/components/schemas/ApiKey" },
                    },
                    required: ["ok", "rawKey", "key"],
                  },
                },
              },
            },
            "400": {
              description: "Invalid request",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden - API access requires Enterprise tier or higher",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/actions/revoke-api-key": {
        post: {
          tags: ["API Keys"],
          summary: "Revoke an API key",
          description:
            "Revokes (soft deletes) an API key by setting its revokedAt timestamp. Only the owner or creator can revoke.",
          operationId: "revokeApiKey",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    keyId: { type: "string", description: "ID of the API key to revoke" },
                  },
                  required: ["keyId"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "API key revoked successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean", example: true },
                    },
                    required: ["ok"],
                  },
                },
              },
            },
            "400": {
              description: "Invalid request",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Forbidden - not permitted to revoke this key",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "API key not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "next-auth.session-token",
          description: "NextAuth.js session cookie",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "API key authentication (prefix: lk_live_ or lk_test_)",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: false },
            error: { type: "string", example: "Error message" },
          },
          required: ["ok", "error"],
        },
        Property: {
          type: "object",
          properties: {
            id: { type: "string", format: "cuid" },
            name: { type: "string", maxLength: 120 },
            address: { type: "string", maxLength: 200 },
            city: { type: "string", maxLength: 100 },
            country: { type: "string", maxLength: 100 },
            timezone: { type: "string", default: "UTC" },
            currency: { type: "string", pattern: "^[A-Z]{3}$", default: "EUR" },
            allowSharedBookings: { type: "boolean", default: false },
            orgId: { type: "string", format: "cuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: [
            "id",
            "name",
            "address",
            "city",
            "country",
            "timezone",
            "currency",
            "allowSharedBookings",
            "orgId",
            "createdAt",
            "updatedAt",
          ],
        },
        PropertyWithUnits: {
          allOf: [
            { $ref: "#/components/schemas/Property" },
            {
              type: "object",
              properties: {
                units: {
                  type: "array",
                  items: { $ref: "#/components/schemas/PropertyUnit" },
                },
                _count: {
                  type: "object",
                  properties: {
                    bookings: { type: "integer" },
                    units: { type: "integer" },
                  },
                },
              },
            },
          ],
        },
        PropertyCreateInput: {
          type: "object",
          properties: {
            name: { type: "string", maxLength: 120 },
            address: { type: "string", maxLength: 200 },
            city: { type: "string", maxLength: 100 },
            country: { type: "string", maxLength: 100 },
            timezone: { type: "string", default: "UTC" },
            currency: { type: "string", pattern: "^[A-Z]{3}$", default: "EUR" },
            allowSharedBookings: { type: "boolean", default: false },
          },
          required: ["name", "address", "city", "country"],
        },
        PropertyUpdateInput: {
          type: "object",
          properties: {
            name: { type: "string", maxLength: 120 },
            address: { type: "string", maxLength: 200 },
            city: { type: "string", maxLength: 100 },
            country: { type: "string", maxLength: 100 },
            timezone: { type: "string" },
            currency: { type: "string", pattern: "^[A-Z]{3}$" },
            allowSharedBookings: { type: "boolean" },
          },
        },
        PropertyUnit: {
          type: "object",
          properties: {
            id: { type: "string", format: "cuid" },
            propertyId: { type: "string", format: "cuid" },
            name: { type: "string", maxLength: 120 },
            kind: { type: "string", enum: ["WholeUnit", "Bed"] },
            bedCount: { type: "integer", minimum: 1, default: 1 },
            description: { type: "string", nullable: true },
            orgId: { type: "string", format: "cuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: [
            "id",
            "propertyId",
            "name",
            "kind",
            "bedCount",
            "orgId",
            "createdAt",
            "updatedAt",
          ],
        },
        UsageMetrics: {
          type: "object",
          properties: {
            properties: { type: "integer", minimum: 0 },
            units: { type: "integer", minimum: 0 },
            storageBytes: { type: "integer", minimum: 0 },
            maxProperties: { type: "integer" },
            maxUnits: { type: "integer" },
            maxStorageBytes: { type: "integer" },
            tier: { type: "string", enum: ["STARTER", "PRO", "ENTERPRISE"] },
            hasAdvancedAnalytics: { type: "boolean" },
            hasTeamRoles: { type: "boolean" },
            hasApiAccess: { type: "boolean" },
          },
          required: [
            "properties",
            "units",
            "storageBytes",
            "maxProperties",
            "maxUnits",
            "maxStorageBytes",
            "tier",
            "hasAdvancedAnalytics",
            "hasTeamRoles",
            "hasApiAccess",
          ],
        },
        Receipt: {
          type: "object",
          properties: {
            id: { type: "string", format: "cuid" },
            fileName: { type: "string" },
            fileSize: { type: "integer" },
            mimeType: { type: "string" },
            url: { type: "string", format: "uri" },
            expenseId: { type: "string", format: "cuid", nullable: true },
            orgId: { type: "string", format: "cuid" },
            uploadedById: { type: "string", format: "cuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: [
            "id",
            "fileName",
            "fileSize",
            "mimeType",
            "url",
            "orgId",
            "uploadedById",
            "createdAt",
            "updatedAt",
          ],
        },
        ReceiptWithUrl: {
          allOf: [
            { $ref: "#/components/schemas/Receipt" },
            {
              type: "object",
              properties: {
                downloadUrl: { type: "string", format: "uri", description: "Signed download URL (expires in 1 hour)" },
              },
            },
          ],
        },
        Attachment: {
          type: "object",
          properties: {
            id: { type: "string", format: "cuid" },
            fileName: { type: "string" },
            fileSize: { type: "integer" },
            mimeType: { type: "string" },
            url: { type: "string", format: "uri" },
            entityType: { type: "string", enum: ["property", "unit", "booking", "expense"] },
            entityId: { type: "string", format: "cuid" },
            orgId: { type: "string", format: "cuid" },
            uploadedById: { type: "string", format: "cuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: [
            "id",
            "fileName",
            "fileSize",
            "mimeType",
            "url",
            "entityType",
            "entityId",
            "orgId",
            "uploadedById",
            "createdAt",
            "updatedAt",
          ],
        },
        AttachmentWithUrl: {
          allOf: [
            { $ref: "#/components/schemas/Attachment" },
            {
              type: "object",
              properties: {
                downloadUrl: { type: "string", format: "uri", description: "Signed download URL (expires in 1 hour)" },
              },
            },
          ],
        },
        ApiKey: {
          type: "object",
          properties: {
            id: { type: "string", format: "cuid" },
            name: { type: "string" },
            keyPrefix: { type: "string", description: "First 8 characters of the key for identification" },
            createdAt: { type: "string", format: "date-time" },
            expiresAt: { type: "string", format: "date-time", nullable: true },
            revokedAt: { type: "string", format: "date-time", nullable: true },
          },
          required: ["id", "name", "keyPrefix", "createdAt"],
        },
      },
    },
    security: [{ cookieAuth: [] }],
  }

  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  })
}