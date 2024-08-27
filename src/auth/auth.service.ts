import { KeyVaultService } from './../kayvault/KeyVaultService ';
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Role } from "src/shared/enum/Role";
import { User } from "src/user/entities/user.entity";
import { Repository } from "typeorm";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private KeyVaultService:KeyVaultService
  ) {}

  async loginWithMobile(body: any): Promise<any> {
    try {
      let  user = await this.findUserByEmail(body.email);
      if(!user){
         user  = await this.createAzureUser({displayName: body.name, email:body.email});
      }
      const token = await this.generateToken(user);
      return {...user,token}
    } catch (err) {
      return null
    }
  } 

  private async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  private async createAzureUser(payload: {
    displayName: string;
    email: string;
  }): Promise<User> {
    const user = this.userRepository.create({
      email: payload.email,
      fullName: payload.displayName ?? "",
      role: Role.Viewer, // Adjust the role as needed
    });
    return this.userRepository.save(user);
  }

  private async generateToken(user: User): Promise<string> {
    return this.jwtService.signAsync(
      { id: user.id, email: user.email, role: user.role },
      { secret: process.env.JWT_SECRET, expiresIn: "1d" },
    );

    
    // we are enable keyvalut in production after configure keyvalut on azure
  
    //   const jwtSecret = await this.KeyVaultService.getSecret('PROD-DB-JWT_SECRET');
  
    //   return this.jwtService.signAsync(
    //     { id: user.id, email: user.email, role: user.role },
    //     { secret: jwtSecret, expiresIn: '1d' },
    //   );
  }


  
}
