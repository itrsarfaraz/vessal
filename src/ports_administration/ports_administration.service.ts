import { Injectable } from '@nestjs/common';
import { CreatePortsAdministrationDto,isArchiveDto } from './dto/create-ports_administration.dto';
import { UpdatePortsAdministrationDto } from './dto/update-ports_administration.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortsAdministration } from './entities/ports_administration.entity';
import { WriteResponse, paginateResponse } from 'src/shared/response';
import { IPagination } from 'src/shared/paginationEum';

@Injectable()
export class PortsAdministrationService {
  constructor(
    @InjectRepository(PortsAdministration)
    private readonly PortsAdministrationRepository : Repository<PortsAdministration>
  ){}

  async createOrUpdate(createPortsAdministrationDto: CreatePortsAdministrationDto) {
    try {
      
      if(createPortsAdministrationDto.id===null||createPortsAdministrationDto.id===""){
      delete createPortsAdministrationDto.id;
    }
      const {id} = createPortsAdministrationDto;
      const Responsemsg = id ? "Ports Updated Successfully."
      : "Ports Created Successfully.";

    const data = await this.PortsAdministrationRepository.save(createPortsAdministrationDto);

    return WriteResponse(200, data, Responsemsg);
  } catch (error) {
    
    return WriteResponse(500, false, "Something Went Wrong.");
  }
}
  
   async findAll() {
    try {
      const Ports = await this.PortsAdministrationRepository.find({where: {isArchive: false }, order: {"name" : "ASC"}});

      if (Ports.length > 0) {
        return WriteResponse(200,Ports, "Record Found Seccessfully.");
      }
      return WriteResponse(404, [], "Record Not Found");
    } catch (err) {
     
      return WriteResponse(500, false, "Something Went Wrong.");
    }
}

 

 async findOne(id: string) {
  const Ports = await this.PortsAdministrationRepository.findOne({ where:{id:id}});
  if (!Ports) {
    return WriteResponse(404, false, "Ports Not Found.");
  }
  return WriteResponse(200, Ports, "Ports Found Successfully.");
}
   
  
  
   async remove(id: string) {
    try {
      const Ports = await this.PortsAdministrationRepository.findOne({
        where: { id: id},
      });
      if (!Ports) {
        return WriteResponse(404, [], "Record Not Found");
      }
      await this.PortsAdministrationRepository.update(id, { isArchive: true });
      return WriteResponse(200, true, "Record Deleted Successfully.");
    } catch (err) {
     
      return WriteResponse(500, false, "Something Went Wrong.");
    }
 
 }


 async pagination(pagination: IPagination){
  try {
    const { curPage, perPage, whereClause } = pagination;
    let lwhereClause = "f.isDeleted = false";
    const fieldsToSearch = [
      "name",
      "countryCode",
      "portNo",
      "unCode",
    ];
    fieldsToSearch.forEach((field) => {
      const fieldValue = whereClause.find((p) => p.key === field)?.value;
      if (fieldValue) {
        lwhereClause += ` AND f.${field} LIKE '%${fieldValue}%'`;
      }
    });

    const allValue = whereClause.find((p) => p.key === "all")?.value;
    if (allValue) {
      const conditions = fieldsToSearch
        .map((field) => `f.${field} LIKE '%${allValue}%'`)
        .join(" OR ");
      lwhereClause += ` AND (${conditions})`;
    }

    const isArchiveVal = whereClause.find((p) => p.key === "isArchive")?.value;
    if (isArchiveVal) {
      lwhereClause += ` AND f.isArchive=${isArchiveVal == 'true' ? true : false }`;
    }
    const skip = (curPage - 1) * perPage;
    const [list, count] = await this.PortsAdministrationRepository
      .createQueryBuilder("f")
      .where(lwhereClause)
      .skip(skip)
      .take(perPage)
      .orderBy("f.createdOn", "DESC")
      .getManyAndCount();


    return paginateResponse(list, count);
  } catch (err) {
  
    return WriteResponse(500, false, 'Something Went Wrong')
  }
}
async isArchive(isArchiveDto: isArchiveDto) {
  try {
    const responseMsg = isArchiveDto.isArchive === true ? "Port archived successfully" : "Port unarchived successfully";
    const ports = await this.PortsAdministrationRepository.findOne({ where: { id: isArchiveDto.administrationid } });

    if (!ports) {
      return WriteResponse(404, false, "Port not found");
    }

    await this.PortsAdministrationRepository.update(isArchiveDto.administrationid, { isArchive: isArchiveDto.isArchive });
    return WriteResponse(200, true, responseMsg);
  } catch (error) {
    console.error("Error in isArchive method:", error);
    return WriteResponse(500, false, "Something went wrong");
  }
}

}