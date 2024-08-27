import { KeyVaultService } from './../kayvault/KeyVaultService ';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { UserService } from 'src/user/user.service';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: UserService,
    private readonly KeyVaultService: KeyVaultService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET, // Replace with your own secret key


      // we are enable keyvalut in production after configure keyvalut on azure

      // secretOrKeyProvider: async (request, rawJwtToken, done) => {
      //   try {
      //     const jwtSecret = await KeyVaultService.getSecret('PROD-DB-JWT_SECRET');
      //     done(null, jwtSecret);
      //   } catch (err) {
      //     done(err, false);
      //   }
      // },
    });
  }

  async validate(payload) {
    const user = await this.authService.validateUserById(payload.id);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
