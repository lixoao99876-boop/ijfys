import { Module } from "@nestjs/common";
import { ScoringModule } from "../scoring/scoring.module";
import { HomeConfigModule } from "../home-config/home-config.module";
import { CollectionModule } from "../collection/collection.module";
import { RecommendationModule } from "../recommendation/recommendation.module";
import { ApiController } from "./api.controller";
import { ApiService } from "./api.service";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { CommentController } from "./comment.controller";
import { CommentService } from "./comment.service";

@Module({
  imports: [ScoringModule, HomeConfigModule, CollectionModule, RecommendationModule],
  controllers: [ApiController, UserController, CommentController],
  providers: [ApiService, UserService, CommentService],
  exports: [CommentService],
})
export class ApiModule {}
