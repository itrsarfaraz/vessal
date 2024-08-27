import { Injectable } from '@nestjs/common';
import { SecretClient } from '@azure/keyvault-secrets';
import {  EnvironmentCredential, EnvironmentCredentialOptions } from '@azure/identity';

@Injectable()
export class KeyVaultService {
  private secretClient: SecretClient;

  constructor() {
    const vaultName = process.env.AZURE_KEY_VAULT_NAME;
    const url = `https://${vaultName}.vault.azure.net/`;
    const options: EnvironmentCredentialOptions = {
      additionallyAllowedTenants: ['*'], // Allows acquiring tokens for any tenant
    };
    const credential = new EnvironmentCredential(options);
    this.secretClient = new SecretClient(url, credential);
  }

  async getSecret(secretName: string): Promise<string> {
    const secret = await this.secretClient.getSecret(secretName);
    return secret.value;
  }
}
