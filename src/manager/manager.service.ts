import { Injectable } from '@nestjs/common';
import { CreateManagerDto } from './dto/create-manager.dto';
import { UpdateManagerDto } from './dto/update-manager.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Manager } from './entities/manager.entity';
import { Repository } from 'typeorm';
import { WriteResponse } from 'src/shared/response';

@Injectable()
export class ManagerService {
  constructor(
    @InjectRepository(Manager)
    private readonly managerRepo: Repository<Manager>
  ) { }

  async createOrUpdate(createManagerDto: CreateManagerDto) {
    try {
      if (createManagerDto.id === null || createManagerDto.id === "") {
        delete createManagerDto.id;
      }

      const { id } = createManagerDto;
      const Responsemsg = id ? "Manager Updated Successfully."
        : "Manager Created Successfully.";

      const data = await this.managerRepo.save(createManagerDto);
      return WriteResponse(200, data, Responsemsg);
    } catch (error) {
     
      return WriteResponse(500, false, "Something Went Wrong.");
    }
  }

  async findAll() {
    try {
      const manager = await this.managerRepo.find({
        where: { isDeleted: false }
      });

      if (manager.length > 0) {
        return WriteResponse(200, manager, "Record Found Seccessfully.");
      }
      return WriteResponse(404, [], "Record Not Found");
    } catch (err) {
     
      return WriteResponse(500, false, "Something Went Wrong.");
    }
  }



  async findOne(id: string) {
    const manager = await this.managerRepo.findOne({
      where: { id: id, isDeleted: false },
    });
    if (!manager) {
      return WriteResponse(404, false, "Manager Not Found.");
    }
    return WriteResponse(200, manager, "Manager Found Successfully.");
  }



  async remove(id: string) {
    try {
      const manager = await this.managerRepo.findOne({
        where: { id: id, isDeleted: false },
      });
      if (!manager) {
        return WriteResponse(404, [], "Record Not Found");
      }
      await this.managerRepo.update(id, { isDeleted: true });
      return WriteResponse(200, true, "Record Deleted Successfully.");
    } catch (err) {
     
      return WriteResponse(500, false, "Something Went Wrong.");
    }

  }

}
