# SurveyExports-Dev

Development upload repository for local builds of [Survey2026](https://github.com/ishizuki-tech/Survey2026).

This repository is intentionally separate from the production upload repository.

## Purpose

Survey2026 uses separate GitHub repositories for development and production uploads.

| Build environment | Upload repository |
| --- | --- |
| Local development build | `ishizuki-tech/SurveyExports-Dev` |
| Production / CI build | `ishizuki-tech/SurveyExports` |

Local development builds use this repository for survey exports, voice files, diagnostics, logs, and deferred/retried uploads.

This separation allows developers to test the complete upload flow without writing development or test data to the production repository.

Local Survey2026 builds also include a safety check that prevents a local build from uploading to the production `SurveyExports` repository.

## Developer Access

Developers who need to test GitHub uploads from a local Survey2026 build need write access to this repository.

To request collaborator access, contact:

**ishizuki.tech@gmail.com**

Each developer should use their own GitHub account and their own Personal Access Token (PAT).

**Do not share PATs between developers.**

## GitHub Personal Access Token

A GitHub PAT is required when a local Survey2026 build needs to upload files to this repository.

If using a fine-grained personal access token, make sure the token is configured for this repository.

### Repository Access

The token must include:

`ishizuki-tech/SurveyExports-Dev`

If the token was created before `SurveyExports-Dev` was added, check the token configuration and add this repository if necessary.

### Repository Permissions

The token must have:

**Repository permissions → Contents → Read and write**

This permission is required because Survey2026 creates files in this repository through the GitHub API.

A token that can read the repository but does not have write permission may authenticate successfully but fail when the application attempts to upload a file.

## First-Time Setup

Before testing uploads from a local Survey2026 build:

1. Request collaborator access to `ishizuki-tech/SurveyExports-Dev` if you do not already have write access.
2. Accept the GitHub repository invitation, if applicable.
3. Use your own GitHub Personal Access Token.
4. Make sure the PAT includes `SurveyExports-Dev`.
5. Make sure the PAT has **Contents: Read and write**.
6. Pull the latest Survey2026 `main` branch.
7. Build Survey2026 using the normal local-development build configuration.

The local build should resolve its upload destination to:

```text
Upload mode: local
Repository: ishizuki-tech/SurveyExports-Dev
Branch: main
```

## Production Safety

The production upload repository is:

`ishizuki-tech/SurveyExports`

Local development builds must not upload to that repository.

The Survey2026 upload-target policy treats the build configuration as authoritative and rejects the production `SurveyExports` destination when the application is running in local upload mode.

Developers should not change Kotlin source code to switch between development and production upload repositories.

## Troubleshooting

If a local build runs successfully but GitHub uploads fail:

- Confirm that the application is targeting `ishizuki-tech/SurveyExports-Dev`.
- Confirm that the PAT includes this repository.
- Confirm that **Contents** permission is set to **Read and write**.
- Confirm that the GitHub account associated with the PAT has collaborator access when required.
- Confirm that any repository invitation has been accepted.
- Do not replace the development destination with the production `SurveyExports` repository as a workaround.

An HTTP `403` response from GitHub can indicate that authentication succeeded but the credential does not have permission to perform the requested write.

## Security

Never commit a GitHub PAT to this repository or to the Survey2026 source repository.

Never include a PAT in:

- source files
- README files
- Git commits
- Issues or Pull Requests
- screenshots
- logs shared with other developers

Each developer is responsible for managing their own GitHub credential.

## Default Branch

The default upload branch for this repository is:

`main`
