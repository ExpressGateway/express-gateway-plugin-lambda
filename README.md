# Express Gateway AWS Lambda Plugin

* Proxy to AWS Lambda functions with Express Gateway

## Plugin Settings

* `invocationType` - [`RequestResponse` _(default)_ | `Event` | `DryRun`] - AWS Lambda invocation type.
* `logType` - [`None` _(default)_ | `Tail`] - AWS Lambda log type.
* `unhandledStatus` - [default: `500`] - When the Lambda function returns with an unhandled error, usually due to an absence of available resources, this status code will be returned to the client.
* `useCustomIntegration` - [true | false _(default)_] - Use a custom integration as specified by the `req.egContext.lambda` object.
* `maxJSONParseLength` - [_(default: 5 * 1.049e+6, 5MiB)_] - Maximum number of bytes to allow for parsing responses as JSON in an attempt to guess the MIME type.

## `lambda-proxy` Policy

### Policy Settings

All plugin settings can be overridden on a per-policy basis.  In addition, here are some policy-specific settings:

* `functionName` - [_(required)_] - Specify the Lambda function name.
* `qualifier` - [_(optional)_] - Specify a Lambda function version or alias name.
* `ignorePath`- [true | false _(default)_, _(optional, only valid when using Proxy Integration)_] - Don't proxy to the incoming request's URL path.
* `stripPath` - [true | false _(default)_, _(optional, only valid when using Proxy Integration)_] - Strip the API Endpoint path prefix from the forwarded URL path.

### Integration Modes

#### Proxy Integration

Proxy Integration mode sends the Lambda function an event that looks similar to an AWS API Gateway event.  The response is expected to be in the same format as the AWS API Gateway Lambda response.

#### Custom Integration

Custom Integration Mode takes a look at the `req.egContext.lambda` object and forwards that as the incoming event to the AWS Lambda function.  The response is taken, the content type is guessed, and it finally returns to the client.

## License

[Apache-2.0 License][apache-license]

Copyright © LunchBadger, Inc. and Contributors

[apache-license]: https://github.com/expressgateway/express-gateway-plugin-lambda/blob/master/LICENSE
