import { Injectable } from '@nestjs/common';
import { CreateOverviewDto } from './dto/create-overview.dto';
import { UpdateOverviewDto } from './dto/update-overview.dto';
import { WriteResponse } from 'src/shared/response';
import { InjectRepository } from '@nestjs/typeorm';
import { Inspection } from 'src/inspection/entities/inspection.entity';
import { Repository } from 'typeorm';
import { group } from 'console';
import { VesselTypes } from 'src/vessel/entities/vessel.entity';

@Injectable()
export class OverviewService {
  constructor(
    @InjectRepository(Inspection)
    private readonly inspectionRepo: Repository<Inspection>,

    @InjectRepository(VesselTypes)
    private readonly vesselTypesRepo: Repository<VesselTypes>,
  ){}

  
  create(createOverviewDto: CreateOverviewDto) {
    return 'This action adds a new overview';
  }
  

  async getGroupedInspectionStatusCounts() {
    try {
      // Fetch all vessel types to ensure we have a complete list
      const vesselTypes = await this.vesselTypesRepo.find({ select: ["name"] });
      const vesselTypeNames = vesselTypes.map(vt => vt.name);
  
      // Fetch all possible inspection statuses
      const statuses = await this.inspectionRepo.createQueryBuilder('inspection')
        .select('DISTINCT inspection.status', 'status')
        .where("inspection.status != 'ClosedPA'")
        .getRawMany();
  
      const statusNames = statuses.map(s => s.status);
  
      // Fetch inspection counts grouped by status and vessel type
      const result = await this.inspectionRepo.createQueryBuilder('inspection')
        .leftJoinAndSelect('inspection.vessel', 'vessel')
        .leftJoinAndSelect('vessel.vesselType', 'vesselType')
        .select([
          'vesselType.name AS vesselTypeName',
          'inspection.status AS status',
          'COUNT(inspection.id) AS inspectionCount',
          'COUNT(DISTINCT vessel.id) AS vesselCount'
        ])
        .where("inspection.status != 'ClosedPA'")
        .addGroupBy('inspection.status')
        .addGroupBy('vesselType.name')
        .getRawMany();
  
      // Initialize the response data structure with all possible combinations
      const groupedData = statusNames.map(status => ({
        status,
        vesselTypes: vesselTypeNames.map(vesselTypeName => ({
          vesselTypeName,
          inspectionCount: '0',
          vesselCount: '0'
        })),
        totalInspectionCount: 0,
        totalVesselCount: 0
      }));
  
      // Populate the response data structure with actual counts
      result.forEach(({ status, vesselTypeName, inspectionCount, vesselCount }) => {
        const statusGroup = groupedData.find(group => group.status === status);
        const vesselTypeGroup = statusGroup.vesselTypes.find(vt => vt.vesselTypeName === vesselTypeName);
  
        vesselTypeGroup.inspectionCount = inspectionCount;
        vesselTypeGroup.vesselCount = vesselCount;
  
        statusGroup.totalInspectionCount += parseInt(inspectionCount, 10);
        statusGroup.totalVesselCount += parseInt(vesselCount, 10);
      });
  
      // Add the "All Vessel Types" entry and sort the vessel types alphabetically
      groupedData.forEach(group => {
        group.vesselTypes.sort((a, b) => a.vesselTypeName.localeCompare(b.vesselTypeName));
        group.vesselTypes.unshift({
          vesselTypeName: "All Vessel Types",
          inspectionCount: group.totalInspectionCount.toString(),
          vesselCount: group.totalVesselCount.toString()
        });
      });
  
      return WriteResponse(200, groupedData, 'Total status count successfully');
    } catch (err) {
      console.error(err);
      return WriteResponse(500, false, 'Something went wrong');
    }
  }
  
  


  findOne(id: number) {
    return `This action returns a #${id} overview`;
  }

 remove(id: number) {
    return `This action removes a #${id} overview`;
  }
}
