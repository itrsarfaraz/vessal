export const storageConfigFactory = async () => ({
    sasKey: process.env['AZURE_STORAGE_SAS_KEY'],
    accountName: process.env['AZURE_STORAGE_ACCOUNT'],
    containerName: 'public',
});


// we are enable keyvalut in production after configure keyvalut on azure

// import { KeyVaultService } from '../kayvault/KeyVaultService '; // Adjust the path as necessary

// export const storageConfigFactory = async () => {
//   const keyVaultService = new KeyVaultService();

//   const sasKey = await keyVaultService.getSecret('AZURE_STORAGE_SAS_KEY');
//   const accountName = await keyVaultService.getSecret('AZURE_STORAGE_ACCOUNT');
//   const containerName = 'public';

//   return {
//     sasKey,
//     accountName,
//     containerName,
//   };
// };
