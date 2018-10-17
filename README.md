[![npm][npm-version-badge]][npm-package-url]
[![CircleCI][circleci-badge]][circleci-master-url]
[![Gitter][gitter-badge]][gitter-room-url]

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

##### Proxy Integration Lambda Event

With Proxy Integration mode, the HTTP request gets turned into a JSON object that gets invoked with the Lambda function.

Here's an example:

```json
{
  "httpMethod": "POST",
  "path": "/California?name=Kevin",
  "resource": "/:proxy",
  "queryStringParameters": {
    "name": "Kevin"
  },
  "pathParameters": {
    "proxy": "California"
  },
  "headers": {
    "host": "localhost:60852",
    "user-agent": "curl/7.51.0",
    "accept": "*/*",
    "content-type": "application/json",
    "day": "Thursday",
    "content-length": "18"
  },
  "requestContext": {
    "apiEndpoint": {
      "apiEndpointName": "default",
      "host": "*",
      "path": "/:proxy",
      "paths": "/:proxy",
      "scopes": []
    },
    "resourcePath": "/:proxy",
    "httpMethod": "POST",
    "requestId": "3SpeBYb8SK6CvH7Ipx56pK"
  },
  "isBase64Encoded": false,
  "body": "{\"time\":\"morning\"}"
}
```

##### Proxy Integration Lambda Response

The Lambda response must use the following JSON structure:

```json
{
    "isBase64Encoded": true|false,
    "statusCode": httpStatusCode,
    "headers": { "headerName": "headerValue", ... },
    "body": "..."
}
```

If no `Content-Type` header is provided, this plugin will take a buest guess at the MIME type before sending the response to the client.  It is recommended to always include a `Content-Type` header.

#### Custom Integration

Requires the setting `useCustomIntegration` to equal `true`.

Custom Integration Mode takes a look at the `req.egContext.lambda` object and forwards that as the incoming event to the AWS Lambda function.  The response is taken, the content type is guessed, and it finally returns to the client.

If the `req.egContext.lambda` object is not populated, a default event structure will be sent to the AWS Lambda function.  Example:

```json
{
  "method": "POST",
  "path": "/California?name=Kevin",
  "headers": {
    "host": "localhost:61636",
    "user-agent": "curl/7.51.0",
    "accept": "*/*",
    "content-type": "application/json",
    "day": "Thursday",
    "content-length": "18"
  },
  "body": "{\"time\":\"morning\"}"
}
```

This plugin will attempt a best guess at the `Content-Type` of the response.  It is recommended to use Proxy Integration whenever possible.

## License

[Apache-2.0 License][apache-license]

Copyright © LunchBadger, Inc. and Contributors

[apache-license]: https://github.com/expressgateway/express-gateway-plugin-lambda/blob/master/LICENSE
[npm-version-badge]: https://img.shields.io/npm/v/express-gateway-plugin-lambda.svg
[npm-package-url]: https://www.npmjs.com/package/express-gateway-plugin-lambda
[circleci-badge]: https://circleci.com/gh/ExpressGateway/express-gateway-plugin-lambda/tree/master.svg?style=shield&circle-token=45cb3093e78cb81947f2adba9ca877acdbb2eb4e
[circleci-master-url]: https://circleci.com/gh/ExpressGateway/express-gateway-plugin-lambda/tree/master
[gitter-badge]: https://img.shields.io/gitter/room/expressgateway/express-gateway.svg
[gitter-room-url]: https://gitter.im/ExpressGateway/express-gateway
