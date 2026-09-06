@description('Location for all resources.')
param location string = resourceGroup().location

var appName = 'klsxtkj-${uniqueString(resourceGroup().id)}'
var planName = 'asp-klsxtkj-${uniqueString(resourceGroup().id)}'

resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2022-09-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'PORT'
          value: '3000'
        }
        {
          name: 'WEBSITES_PORT'
          value: '3000'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'SESSION_SECRET'
          value: 'YPK_CLASS_SECRET_2026'
        }
        {
          name: 'DB_PATH'
          value: '/home/site/wwwroot/database.db'
        }
        {
          name: 'UPLOAD_PATH'
          value: '/home/site/wwwroot/storage/uploads'
        }
      ]
    }
  }
}

output appName string = webApp.name
output defaultHostName string = webApp.properties.defaultHostName
output websiteUrl string = 'https://${webApp.properties.defaultHostName}'
