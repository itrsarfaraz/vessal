import { Manager } from "src/manager/entities/manager.entity";
import { User_Vessel } from "src/user/entities/user.entity";
import { AfterLoad, Column, CreateDateColumn, Entity, Generated, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { Inspection } from 'src/inspection/entities/inspection.entity';
import { serverUrl, storageUrl } from "src/constent";
import { FilesAzureService } from "src/blob-storage/blob-storage.service";

@Entity({ name: "vessel_type" })
export class VesselTypes {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @Column({ nullable: true })
  name: string;

  @CreateDateColumn()
  createdOn: Date;

  @CreateDateColumn()
  updatedOn: Date;

  @Column({ type: "boolean", default: false })
  isDeleted: boolean;

  @OneToMany(() => Vessel, (vessel) => vessel.vesselType)
  vessel: Vessel[];

}
@Entity({ name: "vessel" })
export class Vessel {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @Column({ nullable: true })
  vesselImage: string;

  @Column({ nullable: true })
  vesselImageName: string;

  @Column({ nullable: true })
  vesselName: string;

  @Column({ nullable: true })
  vesselTypeId: string;

  @Column({ nullable: true })
  flag: string;

  @Column({ nullable: true })
  imoNo: number;

  @Column({ nullable: true })
  class: string;

  @Column({ nullable: true })
  dwt: number;

  @Column({ nullable: true })
  yearBuilt: number;

  @Column({ nullable: true })
  teus: number;

  @Column({ nullable: true })
  engine: string;

  @Column({ nullable: true })
  lastDueDateDryDock: Date;

  @Column({ nullable: true })
  nextDueDateDryDock: Date;

  @Column({ nullable: true })
  owner: string;

  @Column({ nullable: true })
  ownershipStartDate: Date;

  @Column({ nullable: true })
  manager: string;

  @Column({ nullable: true })
  charterer: string;

  @Column({ nullable: true })
  managerId: string;

  @Column({ nullable: true })
  chartererRangeStartDate: Date;

  @Column({ nullable: true })
  chartererRangeEndDate: Date;

  @Column({ nullable: true })
  hireRate: number;

  @Column({ nullable: true })
  lastVettingInspection: Date;

  @Column({ nullable: true })
  offHires: number;

  @Column({ type: "boolean", default: false })
  isDeleted: boolean;

  @Column({ type: "boolean", default: false })
  isArchive: boolean;

  @CreateDateColumn()
  createdOn: Date;

  @CreateDateColumn()
  updatedOn: Date;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;

  @Column({ nullable: true })
  deletedBy: string;

  @OneToMany(() => User_Vessel, (v) => v.vessel)
  userVessels: User_Vessel[];

  @OneToMany(() => Inspection, (inspect) => inspect.vessel)
  inspection: Inspection[];

  @ManyToOne(() => Manager, manager => manager.vessel, { eager: true })
  @JoinColumn({ name: "managerId" })
  managers: Manager;

  @ManyToOne(() => VesselTypes, vesselType => vesselType.vessel)
  @JoinColumn({ name: "vesselTypeId" })
  vesselType: VesselTypes;

  @Column({ nullable: true })
  country: string;
  image_url: string

  // @AfterLoad()
  // setFullImageUrl() {
  //   if (this.vesselImage && !this.vesselImage?.startsWith(storageUrl)) {
  //     this.image_url = `${storageUrl}vessel_images/${this.vesselImage}`;
  //   }
  // }
  @AfterLoad()
  async setFullImageUrl() {
    if (this.vesselImage && !this.vesselImage?.startsWith(storageUrl)) {
      const fileService = new FilesAzureService(); // Adjust instantiation as necessary
      const containerName = "vessel_images"; // Replace with your actual container name
      this.image_url = await fileService.getFileUrl(this.vesselImage, containerName);
    }
  }

}
