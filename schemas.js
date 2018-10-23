const plugin = exports.plugin = {
  '$id': 'http://express-gateway.io/schemas/plugins/lambda.json',
  type: 'object',
  properties: {
    invocationType: {
      title: 'Invocation Type',
      description: 'AWS Lambda invocation type',
      type: 'string',
      enum: ['RequestResponse', 'Event', 'DryRun'],
      //default: 'RequestResponse'
    },
    logType: {
      title: 'Log Type',
      description: 'AWS Lambda log type',
      type: 'string',
      enum: ['None', 'Tail'],
      //default: 'None'
    },
    unhandledStatus: {
      title: 'Unhandled Status',
      description: 'When the Lambda function returns with an unhandled error, usually due to an absence of available resources, this status code will be returned to the client',
      type: 'integer',
      minimum: 100,
      maximum: 599,
      //default: 500
    },
    useCustomIntegration: {
      title: 'Use Custom Integration',
      description: 'Use Custom Integration Mode for AWS Lambda',
      type: 'boolean',
      //default: false
    },
    maxJSONParseLength: {
      title: 'Maximum JSON Parse Length',
      description: 'Maximum number of bytes to allow for parsing responses as JSON in an attempt to guess the MIME type',
      type: 'integer',
      //default: (5 * 1.049e+6) // 5MiB
    }
  }
};

exports.policy = {
  '$id': 'http://express-gateway.io/schemas/policies/lambda-proxy.json',
  type: 'object',
  properties: Object.assign({}, plugin.properties, {
    functionName: {
      title: 'Function Name',
      description: 'The name of the AWS Lambda function to execute',
      type: 'string',
    },
    qualifier: {
      title: 'Qualifier',
      description: 'An AWS Lambda function version or alias name',
      type: 'string'
    },
    ignorePath: {
      title: 'Ignore Path',
      description: 'Don\'t forward to the incoming request\'s URL path (Proxy Integration mode only)',
      type: 'boolean',
      //default: false
    },
    stripPath: {
      title: 'Strip Path',
      description: 'Strip the API Endpoint path prefix from the incoming request\'s URL path (Proxy Integration mode only)',
      type: 'boolean',
      //default: false
    },
  }),
  required: ['functionName']
};
