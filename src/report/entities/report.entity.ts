import { serverUrl } from "src/constent";
import { PdfGateway } from "src/geteway/pdf.gateway";
import { Inspection } from "src/inspection/entities/inspection.entity";
import { InspectionReportStatus } from "src/shared/enum/InspectionReportStatus";
import { AfterInsert, AfterLoad, Column, CreateDateColumn, Entity, Generated, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

@Entity({ name: 'inspection_reports' })
export class Report {
    @PrimaryColumn({ type: 'uuid' })
    @Generated('uuid')
    id: string;

    @Column()
    inspectionId: string;

    @Column()
    vesselId: string;

    @Column()
    inspectorId: string;

    @Column()
    inspectionDate: Date;

    @Column()
    reportGeneratedDate: Date;

    @Column()
    type: string;
    
    @Column()
    overviewType: string;

    @Column()
    reportStatus: string;

    @CreateDateColumn()
    createdOn: Date;

    @CreateDateColumn()
    updatedOn: Date;

    @Column()
    userId: string;

    @Column()
    reportUniqueId:number;

    downloadUrl: string;

    @ManyToOne(() => Inspection, (inspection) => inspection.report)
    @JoinColumn({ name: 'inspectionId' })
    inspection: Inspection;

    @AfterInsert()
    async afterInsert() {
      if (this.reportStatus === InspectionReportStatus.Completed) {
        const pdfGateway = new PdfGateway(); // Instantiate PdfGateway
        pdfGateway.sendNotification(this);
      }
    }

    @AfterLoad()
    async afterLoad(){
    //   const urlMappings = {
    //     Full: `${serverUrl}report/${this.id}/full-report.pdf`,
    //     Consolidated: `${serverUrl}report/${this.id}/consolidate-report.pdf`,
    //     Overview: `${serverUrl}report/fleetReport/${this.id}__vessel_fleet.xlsx`
    // };
      const urlMappings = {
        Full: `report/${this.id}/full-report.pdf`,
        Consolidated: `report/${this.id}/consolidate-report.pdf`,
        Overview: `report/fleetReport/${this.id}__vessel_fleet.xlsx`
    };

    this.downloadUrl = urlMappings[this.type] || '';
    }
}
