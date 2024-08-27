import { Inspection } from "src/inspection/entities/inspection.entity";
import { Column, CreateDateColumn, Entity, Generated, OneToMany, PrimaryColumn } from "typeorm";

@Entity({name:'ports_administration'})
export class PortsAdministration {
    @PrimaryColumn({ type: "uuid" })
    @Generated("uuid")
    id : string;

    @Column()
    name : string;

    @Column()
    countryCode: string;
    @Column()
    countryName: string;

    @Column()
    portNo : string;

    @Column()
    unCode: string;

    @Column()
    longitude : string;

    @Column()
    latitude : string;

    @Column({type:'boolean',default:false})
    isArchive:boolean ;

    @CreateDateColumn()
    createdOn : Date;

    @CreateDateColumn()
    updatedOn : Date;
    
    @Column({ type: "boolean", default: false})
    isDeleted: boolean;

    @Column()
    deletedBy:string;
  
    @Column()
    createdBy:string;
  
    @CreateDateColumn()
    updatedBy:string;

    @OneToMany(() => Inspection, (port) => port.startPort)
    inspection: Inspection;
}
