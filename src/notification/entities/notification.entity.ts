import { notification } from "src/shared/enum/notification";
import { Column, CreateDateColumn, Entity, Generated, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity({name:'notification'})
export class Notification {
    @PrimaryColumn({type:'uuid'})
    @Generated('uuid')
    id :string;

    @Column({enum:notification})
    type:string;

    @Column()
    title:string;

    @Column()
    text:string;

    @Column()
    action:string;

    @Column({type:"simple-json"})
    detail:any;

    @CreateDateColumn()
    createdAt: Date;

    @Column()
    link:string;

    // @Column()
    // isRead: boolean;

    @OneToMany(() => ReadNotification, (n) => n.notification)
    readNotifications: ReadNotification[];
}





@Entity({name: "read_notifications"})
export class ReadNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column()
  notificationId: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isRemoved: boolean;

  @ManyToOne(() => Notification, (n) => n.readNotifications)
  notification: Notification;
}

