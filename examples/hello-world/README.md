# hello-world example

This is a minimal Lambdafai example. It returns the string "Hello, world!" for requests to
the path /hello.

We can use it to illustrate a workflow for creating, testing, and deploying an API using Lambdafai.


## Workflow

### tl;dr

These commands are covered in more detail below:
```
npm install
node index.js create-resources dev
node index.js invoke dev "{path: '/hello'}"
node index.js deploy dev
node index.js promote dev staging
```

### Install Dependencies

As with any NodeJS project, make sure you have node and npm installed, then:
```
npm install
```

### Create Resources

The first step is to create all of the required resources on AWS. This includes:
  1. An IAM role and policy
  2. An API Gateway REST API
  3. Lambda functions for configured Lambdas
  4. DynamoDB tables (there are none in this example)
  5. S3 buckets (there are none in this example)

You can create resources in the `dev` environment by running:
```
node index.js create-resources dev
```
*Note: if your user account does not have permission to access IAM, this step will fail. Still
trying to figure out what to do about that... for now, get someone who does have access to run
this step for you.*

To create resources in a different environment, replace "dev" with the name of the environment.

Some resources are created per-environment (DynamoDB, S3). Others are shared across all
environments (Lambda, API Gateway), using tags to isolate code to a particular environment.


### Run Locally

The `invoke` command can be used to execute Lambdas locally. For example:
```
node index.js invoke dev "{path: '/hello'}"
```

This invokes the lambda as though it were in the `dev` environment with a GET request for the
path /hello.

The request can also be specified in a JSON file, for example:
```
node index.js invoke dev my_request.json
```

Valid fields in the request include:
  * `method`: The HTTP method of the request (default 'GET').
  * `path`: The path to request, this can include a querystring, e.g. `/items/123?format=short`
  * `headers`: A dictionary of HTTP headers
  * `body`: The JSON body of the request


### Deploy

Once you're happy with your code, you can deploy it to the `dev` environment (or any other):
```
node index.js deploy dev
```

This will upload the code to Lambda and also update the API Gateway configuration.

When it's done, you should see the following near the bottom of the output:
```
API Root URL:
  https://{id}.execute-api.us-east-1.amazonaws.com/dev
```

You can now access your API via a web browser or curl (replace `{id}` with the actual ID from
the output):
```
curl https://{id}.execute-api.us-east-1.amazonaws.com/dev/hello
```
You should see a `"Hello, world!"` response.


### Promotion

After you're happy with the API in your `dev` environment, you can promote to `staging` and then to `prod`
using the `promote` command. Alternately, you can use whatever deployment workflow you want -- environments
are just names.
```
node index.js promote dev staging
```

This promotes what is currently running in `dev` to `staging` for both Lambda and API Gateway. You
can now access your API in staging:
```
curl https://{id}.execute-api.us-east-1.amazonaws.com/staging/hello
```

Promoting from staging to prod is similar:
```
node index.js promote staging prod
```

#### Rollbacks

Being able to roll back to the previous prod version can be useful. To do this, promote prod to a
`rollback` environment **before** deploying staging to prod, i.e.:
```
node index.js promote prod rollback
node index.js promote staging prod
```

Then, if you need to rollback, you can simply promote `rollback` to `prod` to get your old
environment back:
```
node index.js promote rollback prod
```
