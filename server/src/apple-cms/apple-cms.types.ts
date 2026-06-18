// Apple CMS V10 标准接口返回结构

export interface AppleCmsListResponse {
  code: number;
  msg: string;
  page: number | string;
  pagecount: number;
  limit: number | string;
  total: number;
  list: AppleCmsVod[];
}

export interface AppleCmsVod {
  vod_id: number | string;
  vod_name: string;
  vod_sub?: string;
  type_id?: number;
  type_name?: string;
  vod_class?: string;
  vod_year?: string;
  vod_area?: string;
  vod_remarks?: string;
  vod_serial?: string;
  vod_actor?: string;
  vod_director?: string;
  vod_pic?: string;
  vod_pic_slide?: string;
  vod_blurb?: string;
  vod_content?: string;
  vod_time?: string;
  vod_score?: string;
  vod_play_from?: string;
  vod_play_url?: string;
}

export interface ParsedPlaySource {
  code: string;           // ffm3u8 / lz_m3u8
  episodes: Array<{ name: string; url: string; index: number }>;
}

export interface FetchListOptions {
  page?: number;
  hours?: number;          // 增量小时数
  typeId?: number;
  ids?: Array<number | string>;
}

// ---------- 演员 ----------
export interface AppleCmsActor {
  actor_id: number | string;
  actor_name: string;
  actor_en?: string;
  actor_alias?: string;
  actor_sex?: string;
  actor_area?: string;
  actor_pic?: string;
  actor_blurb?: string;
  actor_remarks?: string;
  actor_height?: string;
  actor_weight?: string;
  actor_birthday?: string;
  actor_birtharea?: string;
  actor_blood?: string;
  actor_starsign?: string;
  actor_school?: string;
  actor_works?: string;
  actor_time?: string;
}

// ---------- 资讯 ----------
export interface AppleCmsArticle {
  art_id: number | string;
  art_name: string;
  art_sub?: string;
  art_en?: string;
  type_name?: string;
  art_author?: string;
  art_from?: string;
  art_remarks?: string;
  art_pic?: string;
  art_pic_slide?: string;
  art_blurb?: string;
  art_content?: string;
  art_jumpurl?: string;
  art_score?: string | number;
  art_hits?: number;
  art_up?: number;
  art_down?: number;
  art_time?: string;
}
