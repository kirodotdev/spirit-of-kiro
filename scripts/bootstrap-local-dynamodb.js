const { DynamoDBClient, CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { readFileSync } = require('fs');
const { parse } = require('yaml');

// Configuration
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const REGION = 'us-west-2'; // This doesn't matter for local DynamoDB
const TEMPLATE_PATH = './server/iac/dynamodb.yml';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  endpoint: DYNAMODB_ENDPOINT,
  region: REGION,
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy'
  }
});

async function createTable(tableDef) {
  try {
    const command = new CreateTableCommand({
      TableName: tableDef.TableName,
      BillingMode: tableDef.BillingMode,
      AttributeDefinitions: tableDef.AttributeDefinitions,
      KeySchema: tableDef.KeySchema
    });

    await dynamoClient.send(command);
    console.log(`✅ Created table: ${tableDef.TableName}`);
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log(`ℹ️ Table already exists: ${tableDef.TableName}`);
    } else {
      console.error(`❌ Error creating table ${tableDef.TableName}:`, error.message);
      throw error;
    }
  }
}

async function bootstrapLocalDynamoDB() {
  console.log('🚀 Starting local DynamoDB bootstrap...');
  
  // Read and parse the CloudFormation template
  console.log(`📋 Reading template file: ${TEMPLATE_PATH}`);
  const templateContent = readFileSync(TEMPLATE_PATH, 'utf8');
  // Neutralize CloudFormation intrinsic tags (e.g. !Ref, !GetAtt) which the
  // plain YAML parser cannot handle. They only appear in Outputs, which this
  // bootstrap does not use (it reads Resources). See issue #7.
  const CFN_TAGS = /!(Ref|GetAtt|Sub|Join|Select|Split|GetAZs|ImportValue|FindInMap|Base64|Cidr|If|Equals|Not|And|Or|Condition)\b/g;
  const template = parse(templateContent.replace(CFN_TAGS, ''));
  
  // Extract table definitions from the template
  const tables = Object.entries(template.Resources)
    .filter(([_, resource]) => resource.Type === 'AWS::DynamoDB::Table')
    .map(([_, resource]) => ({
      TableName: resource.Properties.TableName,
      BillingMode: resource.Properties.BillingMode,
      AttributeDefinitions: resource.Properties.AttributeDefinitions,
      KeySchema: resource.Properties.KeySchema
    }));

  console.log(`🔍 Found ${tables.length} tables to create:`);
  tables.forEach(table => {
    console.log(`   - ${table.TableName}`);
  });

  // Create each table
  for (const table of tables) {
    console.log(`\n🔄 Processing table: ${table.TableName}`);
    console.log('   📝 Table details:');
    console.log(`      Billing Mode: ${table.BillingMode}`);
    
    console.log('   🔑 Attribute Definitions:');
    table.AttributeDefinitions.forEach(attr => {
      console.log(`      - ${attr.AttributeName} (${attr.AttributeType})`);
    });
    
    console.log('   🔐 Key Schema:');
    table.KeySchema.forEach(key => {
      console.log(`      - ${key.AttributeName} (${key.KeyType})`);
    });
    
    console.log('   🚀 Creating table...');
    await createTable(table);
  }

  console.log('\n✨ Local DynamoDB bootstrap complete!');
}

// Run the bootstrap
bootstrapLocalDynamoDB().catch(error => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
}); 