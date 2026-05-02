# logging-middleware

Production-grade centralized logging package. Dispatches structured log entries to the evaluation logging service with retry logic, validation, and graceful error handling.

## Installation

```bash
npm install
npm run build
```

## Usage

```typescript
import { Log } from './logging_middleware/src';

await Log('backend', 'info', 'service', 'Fetched depot data successfully');
await Log('backend', 'error', 'handler', 'Invalid depot ID received');
await Log('backend', 'warn', 'middleware', 'Rate limit threshold approaching');
```

## Configuration

Copy `.env.example` to `.env` and set:

| Variable             | Description                        | Default                                      |
|----------------------|------------------------------------|----------------------------------------------|
| `LOG_API_BASE_URL`   | Base URL for the logging service   | `http://20.207.122.201/evaluation-service`   |
| `LOG_BEARER_TOKEN`   | Bearer token for authentication    | —                                            |
| `LOG_RETRY_ATTEMPTS` | Number of retry attempts           | `3`                                          |
| `LOG_RETRY_DELAY_MS` | Base delay between retries (ms)    | `500`                                        |
| `LOG_TIMEOUT_MS`     | Request timeout (ms)               | `5000`                                       |

## API

### `Log(stack, level, packageName, message): Promise<LogResponse>`

| Parameter     | Type            | Allowed Values                                                                                                                          |
|---------------|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| `stack`       | `LogStack`      | `backend`, `frontend`                                                                                                                   |
| `level`       | `LogLevel`      | `debug`, `info`, `warn`, `error`, `fatal`                                                                                               |
| `packageName` | `LogPackageName`| `cache`, `controller`, `cron_job`, `db`, `domain`, `handler`, `repository`, `route`, `service`, `auth`, `config`, `middleware`, `utils`, `api`, `component`, `hook`, `page`, `state`, `style` |
| `message`     | `string`        | Non-empty string                                                                                                                        |

## Design Principles

- **Never crashes**: All errors are caught and returned as `LogResponse`
- **Retry with back-off**: Exponential delay between retry attempts
- **Singleton Axios**: One instance per process with injected auth interceptor
- **Validation-first**: Params validated before any network call
- **No console logging**: Zero use of `console.*`
