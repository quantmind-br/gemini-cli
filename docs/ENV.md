# Environment Variables

This document lists the environment variables used by the Gemini CLI application.

| Variable                        | Description                                                     | Default Value                       |
| ------------------------------- | --------------------------------------------------------------- | ----------------------------------- |
| `CLI_VERSION`                   | The version of the CLI.                                         | The version in `package.json`       |
| `GEMINI_MODEL`                  | The default model to use for generation.                        | `gemini-1.5-pro-latest`             |
| `GEMINI_DISABLE_MODEL_FALLBACK` | Disable automatic fallback to a different model on rate limits. | `true`                              |
| `GEMINI_RETRY_DELAY_MULTIPLIER` | The multiplier for exponential backoff delay on 429 errors.     | `2`                                 |
| `GEMINI_MAX_RETRY_DELAY`        | The maximum delay in seconds for retries on 429 errors.         | `30`                                |
| `GEMINI_MAX_429_RETRIES`        | The maximum number of retries for 429 errors.                   | `5`                                 |
| `OTEL_EXPORTER_OTLP_ENDPOINT`   | The OTLP endpoint for telemetry.                                | `https://console.cloud.google.com/` |
| `HTTPS_PROXY`                   | The proxy to use for HTTPS requests.                            |                                     |
| `https_proxy`                   | The proxy to use for HTTPS requests.                            |                                     |
| `HTTP_PROXY`                    | The proxy to use for HTTP requests.                             |                                     |
| `http_proxy`                    | The proxy to use for HTTP requests.                             |                                     |
