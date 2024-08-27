import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import {
  OIDCStrategy,
  IOIDCStrategyOptionWithRequest,
} from "passport-azure-ad";
import { KeyVaultService } from "src/kayvault/KeyVaultService ";
import { Role } from "src/shared/enum/Role";
import { User } from "src/user/entities/user.entity";
import { Repository } from "typeorm";

@Injectable()
export class AzureAdStrategy extends PassportStrategy(
  OIDCStrategy,
  "azure-ad",
) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private keyVaultService: KeyVaultService,
  ) {
    super({
      identityMetadata: `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0/.well-known/openid-configuration`,
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      responseType: "code",
      responseMode: "form_post",
      redirectUrl: process.env.REDIRECT_URL,
      allowHttpForRedirectUrl: true, // Set to false in production
      passReqToCallback: true,
      scope: ["profile", "email", "openid", "User.ReadBasic.All"],
      cookieSameSite: true,
      useCookieInsteadOfSession: true,
      nonceLifetime: 60 * 60 * 24 * 1000 * 7, // state/nonce cookie expiration in seconds
      nonceMaxAmount: 10, // max amount of state/nonce cookie you want to keep (cookie is deleted after validation so this can be very small)
      cookieEncryptionKeys: [
        { key: process.env.COOKIE_EN_KEY, iv: process.env.COOKIE_EN_IV },
      ],
    } as IOIDCStrategyOptionWithRequest);
  }
  
  // we are enable keyvalut in production after configure keyvalut on azure service
  
  //  {
  //     super(AzureAdStrategy.getStrategyOptions(keyVaultService));
  //   }
  
  //   private static async getStrategyOptions(
  //     keyVaultService: KeyVaultService,
  //   ): Promise<IOIDCStrategyOptionWithRequest> {
  //     const tenantId = await keyVaultService.getSecret("PROD-DB-TENANT_ID");
  //     const clientId = await keyVaultService.getSecret("PROD-DB-CLIENT_ID");
  //     const clientSecret = await keyVaultService.getSecret("PROD-DB-CLIENT_SECRET");
  //     const redirectUrl = await keyVaultService.getSecret("PROD-DB-REDIRECT_URL");
  //     const cookieEnKey = await keyVaultService.getSecret("PROD-DB-COOKIE_EN_KEY");
  //     const cookieEnIv = await keyVaultService.getSecret("PROD-DB-COOKIE_EN_IV");
  
  //     return {
  //       identityMetadata: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
  //       clientID: clientId,
  //       clientSecret: clientSecret,
  //       responseType: "code",
  //       responseMode: "form_post",
  //       redirectUrl: redirectUrl,
  //       allowHttpForRedirectUrl: true, // Set to false in production
  //       passReqToCallback: true,
  //       scope: ["profile", "email", "openid", "User.ReadBasic.All"],
  //       cookieSameSite: true,
  //       useCookieInsteadOfSession: true,
  //       nonceLifetime: 60 * 60 * 24 * 1000 * 7, // state/nonce cookie expiration in seconds
  //       nonceMaxAmount: 10, // max amount of state/nonce cookie you want to keep (cookie is deleted after validation so this can be very small)
  //       cookieEncryptionKeys: [{ key: cookieEnKey, iv: cookieEnIv }],
  //     } as IOIDCStrategyOptionWithRequest;
  //   }

  async validate(req, profile: any): Promise<any> {
    const email = profile?._json?.email || profile?._json?.preferred_username;

    try {
      let user = await this.findUserByEmail(email);

      if (!user) {
        user = await this.createAzureUser({
          displayName: profile?.displayName || email,
          email: email,
        });
      }

      if (user && !user.isDeleted) {
        return { ...user };
      }

      // Handle the case where user creation failed
      return null;
    } catch (error) {
      // Handle any unexpected errors
      console.error("Error in AzureAdStrategy validate method:", error);
      return null;
    }
  }

  private async findUserByEmail(email: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (user) {
      const token = await this.generateToken(user);
      return { ...user, token };
    }

    return null;
  }

  private async createAzureUser(payload): Promise<any> {
    const user = await this.userRepository.save({
      email: payload.email,
      fullName: payload.displayName ?? "",
      role: Role.Viewer, // Adjust the role as needed
    });

    if (user) {
      const token = await this.generateToken(user);
      return { ...user, token };
    }

    return null;
  }

  private async generateToken(user: User): Promise<string> {
    // const secret = await this.keyVaultService.getSecret("PROD-DB-USERNAME");
    return this.jwtService.signAsync(
      { ...user },
      {
        secret: process.env.JWT_SECRET, // Provide the secret here and replace with secret
        expiresIn: "1d", // Token expiration
      },
    );
  }

}







