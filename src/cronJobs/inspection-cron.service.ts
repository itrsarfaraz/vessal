import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Inspection,
  inspection_questions,
} from "src/inspection/entities/inspection.entity";
import { Observation } from "src/shared/enum/ObservationEnum";
import { inspectionStatus } from "src/shared/enum/inspectionStatus";
import { Repository } from "typeorm";

@Injectable()
export class InspectionCronService {
  

  constructor(
    @InjectRepository(Inspection)
    private inspectionRepository: Repository<Inspection>,
    @InjectRepository(inspection_questions)
    private inspectionQuestionRepository: Repository<inspection_questions>,
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    await Promise.all([
      this.copyUnansweredQuestionsToNewInspections(),
      this.updateScheduledInspectionsToInProgress(),
    ]);
  }

  async copyUnansweredQuestionsToNewInspections() {
    const today = new Date();
    const formattedToday = today.toISOString();

    // Fetch inspections that match the criteria
    const inspections = await this.inspectionRepository
      .createQueryBuilder("inspection")
      .leftJoinAndSelect("inspection.questions", "question")
      .leftJoinAndSelect("question.actionPlan", "actionPlan")
      .where("DATE(inspection.inspectionDate) < DATE(:formattedToday)", { formattedToday })
      .andWhere("inspection.status IN (:...statuses)", {
        statuses: [inspectionStatus.InProgress, inspectionStatus.PA],
      })
      .getMany();

    // Process each inspection
    for (const inspection of inspections) {
      const newInspection = await this.inspectionRepository.findOne({
        where: {
          vesselId: inspection.vesselId,
          status: inspectionStatus.Scheduled,
        },
      });
      if (newInspection) {
        // Filter unanswered questions
        const unansweredQuestions = inspection.questions.filter(question =>
          question.observation === Observation.Yes &&
          question.actionPlan?.completionPercent !== 100
        );

        // Count total and incomplete questions
        const totalQuestions = inspection.questions.length;
        const incompleteQuestions = inspection.questions.filter(question =>
          question.observation === Observation.No || question.observation === null
        ).length;

        // Update inspection status if all questions are incomplete
        if (totalQuestions === incompleteQuestions) {
          await this.inspectionRepository.update(inspection.id, {
            status: inspectionStatus.Closed,
          });
        }

        // Process unanswered questions
        for (const question of unansweredQuestions) {
          const { id, ...rest } = question;

          // const newQuestion = this.inspectionQuestionRepository.create();
          const oldInspectionId = inspection.id
          const payload = {
            ...rest, // Assuming `question` fields match `InspectionQuestion` entity
            inspectionId: newInspection.id,
            oldInspectionId: oldInspectionId,
            isCopy: true
          }

      

          // Save new question and update new inspection status

          await this.inspectionQuestionRepository.save(payload);
        }
        await this.inspectionRepository.update(newInspection.id, {
          status: inspectionStatus.InProgress,
        });
        // Update inspection status to ClosedPA if there were unanswered questions
        if (unansweredQuestions.length > 0) {
          await this.inspectionRepository.update(inspection.id, {
            status: inspectionStatus.ClosedPA,
          });
        }
      }
    }
  }


  private async updateScheduledInspectionsToInProgress() {
    const today = new Date();
    const formattedToday = today.toISOString();

    const scheduledInspections = await this.inspectionRepository
      .createQueryBuilder("inspection")
      .where(`DATE(inspection.inspectionDate) = DATE('${formattedToday}')`)
      .andWhere("inspection.status = :status", {
        status: inspectionStatus.Scheduled,
      })
      .getMany();

    for (const inspection of scheduledInspections) {
      inspection.status = inspectionStatus.InProgress;
      await this.inspectionRepository.save(inspection);
    }
  }
}
