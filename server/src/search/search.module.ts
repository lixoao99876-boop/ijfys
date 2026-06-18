import { Global, Module } from "@nestjs/common";
import { SearchService } from "./search.service";
import { SearchCron } from "./search.cron";

@Global()
@Module({
  providers: [SearchService, SearchCron],
  exports: [SearchService],
})
export class SearchModule {}
