# Security and Data Handling

## Project

AI Test Coverage Analyzer

This application processes requirements, test-case
descriptions, and AI-generated testing suggestions.

It does not execute uploaded test code or establish
actual executed code coverage.

## Authentication

Authentication is implemented with Better Auth.

Production configuration must use:

- HTTPS for all authenticated traffic.
- A strong, private BETTER_AUTH_SECRET.
- A correct public BETTER_AUTH_URL.
- An explicit trusted-origin configuration.
- HTTP-only session cookies.
- Secure cookies when using HTTPS.
- Appropriate SameSite cookie settings.

Do not disable Better Auth CSRF or origin validation.

## Authorization

All project, requirement, test-case, analysis, and
suggestion endpoints must enforce authenticated
project ownership at the API and database-query level.

Client-side route protection alone is insufficient.

Users must not be able to retrieve, modify, or delete
records belonging to another account.

## Request Protection

The Express security layer provides:

- HTTP security headers.
- Allowed browser origins.
- Mutation-origin checks.
- API request-rate limits.
- Tighter authentication request limits.
- Tighter AI execution limits.
- Declared Content-Length limits.

The JSON and URL-encoded body parsers must also enforce
a real byte limit, including chunked requests.

In-memory rate limits apply only to one API process.
Use a shared store for multi-instance production.

## AI Safety

Requirement and test-case contents are untrusted input.

The AI provider must:

- Keep system instructions separate from user content.
- Use bounded inputs and outputs.
- Validate every structured response.
- Reject fabricated requirement and test references.
- Limit generated suggestions.
- Prevent duplicate concurrent analyses.
- Enforce server-side usage controls.
- Never execute generated code.
- Never automatically modify project data.

Suggestions must require an explicit user action before
being saved as test cases.

AI analysis is an assessment of potential gaps, not
proof of a defect or measured executed test coverage.

## Secrets

Never commit:

- DATABASE_URL
- BETTER_AUTH_SECRET
- OPENAI_API_KEY
- Test-account passwords
- Production environment files
- Private access tokens

Keep secret values in the deployment provider's secret
management or protected environment settings.

If a secret is exposed, revoke or rotate it immediately.
Removing it from a later Git commit is insufficient.

## User Data

The application stores project information, requirements,
test-case descriptions, and saved analysis records.

When the OpenAI provider is enabled, relevant project
content is sent to the configured AI provider to generate
suggested tests.

Do not submit confidential or third-party proprietary
information without permission.

Use fictional or synthetic information in the public
portfolio demonstration.

The project-deletion workflow must be verified to
remove dependent requirements, test cases, analyses,
and suggestions according to the database's cascade
or explicit deletion rules.

Account deletion and retention policies must be
documented separately before handling real customer
or sensitive organizational data.

## Logging and Errors

Production logs must not contain:

- Session cookies
- Authorization headers
- Passwords
- Database credentials
- OpenAI API keys
- Full private project requirements

Public error responses must not expose stack traces,
SQL queries, internal file paths, or provider secrets.

## Deployment Requirements

Before public deployment:

1. Run TypeScript checks, lint, and all automated tests.
2. Run a production dependency audit.
3. Review database ownership queries.
4. Verify authentication and CSRF protections.
5. Verify HTTPS and cookie settings.
6. Configure explicit allowed origins.
7. Confirm production AI usage budgets and limits.
8. Use a separate production database.
9. Check Git history for exposed secrets.
10. Verify project deletion and data retention.
11. Test production error responses.
12. Confirm that no unsafe HTML or generated code
    is executed.

## Reporting Security Issues

Do not publish discovered secrets or exploit details in
public issues.

Use a private communication channel with the repository
maintainer for security-sensitive reports.
