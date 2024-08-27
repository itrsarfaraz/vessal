import { Vessel } from "src/vessel/entities/vessel.entity";
import { Column, CreateDateColumn, Entity, Generated, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";

@Entity({name:'manager'})
export class Manager {
    
    @PrimaryColumn({ type: "uuid" })
    @Generated("uuid")
    id : string;

    @Column()
    name : string;
    
    @CreateDateColumn()
    createdOn : Date;

    @CreateDateColumn()
    updatedOn : Date;
    
    @Column({ type: "boolean", default: false})
    isDeleted: boolean;
    
    @OneToMany(() => Vessel, vessel => vessel.managers)
    vessel: Vessel[];

}
