import { Module } from "@nestjs/common";
import { FfzyProvider } from "./ffzy.provider";
import { LzzyProvider } from "./lzzy.provider";
import { BfzyProvider } from "./bfzy.provider";
import type { ProviderAdapter } from "./provider.interface";

export const PROVIDER_REGISTRY = Symbol("PROVIDER_REGISTRY");
export type ProviderRegistry = ProviderAdapter[];

@Module({
  providers: [
    FfzyProvider,
    LzzyProvider,
    BfzyProvider,
    {
      provide: PROVIDER_REGISTRY,
      inject: [FfzyProvider, LzzyProvider, BfzyProvider],
      useFactory: (...providers: ProviderAdapter[]): ProviderRegistry => providers,
    },
  ],
  exports: [FfzyProvider, LzzyProvider, BfzyProvider, PROVIDER_REGISTRY],
})
export class ProvidersModule {}
