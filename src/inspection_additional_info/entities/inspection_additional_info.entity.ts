import { FilesAzureService } from "src/blob-storage/blob-storage.service";
import { serverUrl, storageUrl } from "src/constent";
import { Inspection } from "src/inspection/entities/inspection.entity";
import {
  AfterLoad,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "inspection_additional_info" })
export class InspectionAdditionalInfo {
  @PrimaryColumn({ type: "uuid" })
  @Generated("uuid")
  id: string;

  @Column()
  inspectionId: string;

  @Column()
  psc: string;

  @Column()
  fileName: string;

  @Column()
  originalFileName: string;

  @Column()
  conditionOfClassName: string;

  @Column()
  classOriginalName: string;
  
  @Column()
  createdBy: string;
  @Column()
  updatedBy: string;

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;

  @Column()
  isArchive: boolean;

  pdf_file: string;

  @ManyToOne(() => Inspection, (inspection) => inspection.additionalInfo)
  @JoinColumn({ name: "inspectionId" })
  inspection: Inspection;

  @AfterLoad()
  async setFullImageUrl() {
    if (this.fileName && !this.fileName?.startsWith(storageUrl)) {
      const fileService = new FilesAzureService(); // Adjust instantiation as necessary
      const containerName = "additionalInfo"; // Replace with your actual container name
      this.pdf_file = await fileService.getFileUrl(
        this.fileName,
        containerName,
      );
    }
  }
}
