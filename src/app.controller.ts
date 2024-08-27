import { Controller, Get, Req, Res } from '@nestjs/common';
import * as path from 'path';

@Controller()
export class AppController {

  @Get()
  getHello(@Req() req, @Res() res): string {
    return  res.sendFile(path.join(__dirname, "client/index.html"));
  }
}
