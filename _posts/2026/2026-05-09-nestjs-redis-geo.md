---
layout: post
title: nestjs Redis GEO 快速入门
subtitle: 玩转地理位置：附近的人与门店搜索
date: 2026-05-09 20:16:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - Redis
---

在众多 LBS（Location-Based Services，基于位置的服务）应用中，像“附近的人”、“查找周围的共享单车”、“附近的餐厅”这样的需求层出不穷。如果在关系型数据库中直接使用复杂的经纬度公式去计算并排序距离，不仅计算代价大，而且性能极差。

Redis 自 3.2 版本之后引入了 `GEO` 数据结构，专门针对地理坐标的空间计算场景进行了高度优化。本文将带领你在 NestJS 中接入 Redis GEO 模块，实现这一常见而强大的业务需求。

## Redis GEO 的核心命令

在编写 NestJS 业务代码之前，我们有必要先了解一下 Redis GEO 相关的原生核心指令：

- `GEOADD key longitude latitude member`：往给定的 key 中添加一个或多个带有经纬度坐标的成员对象。
- `GEOPOS key member`：获取特定成员的绝对经纬度。
- `GEODIST key member1 member2 [unit]`：计算两个成员之间的空间距离（支持 m/km/mi/ft 单位）。
- `GEOSEARCH key FROMMEMBER member BYRADIUS radius unit [...]`：核心查询操作！在 Redis 6.2 以后用来取代老旧的 `GEORADIUS`。按指定的成员或者绝对经纬度，搜索给定半径内/矩形区域内的其他成员，并做自动排序。

> 注：Redis 的 GEO 功能其底层数据结构就是 **Sorted Set（有序集合 ZSET）**，使用 GeoHash 技术把二维的经纬度转为一维的 52 位整数作为 score 来进行存储。所以对 GEO 的过期时间配置等操作，和普通的 ZSET 其实是一样的。

```txt
127.0.0.1:6379> ?
redis-cli 8.6.3
To get help about Redis commands type:
      "help @<group>" to get a list of commands in <group>
      "help <command>" for help on <command>
      "help <tab>" to get a list of possible help topics
      "quit" to exit

To set redis-cli preferences:
      ":set hints" enable online hints
      ":set nohints" disable online hints
Set your preferences in ~/.redisclirc
127.0.0.1:6379> help @geo

  GEOADD key [NX|XX] [CH] longitude latitude member [longitude latitude member ...]
  summary: Adds one or more members to a geospatial index. The key is created if it doesn't exist.
  since: 3.2.0

  GEODIST key member1 member2 [M|KM|FT|MI]
  summary: Returns the distance between two members of a geospatial index.
  since: 3.2.0

  GEOHASH key [member [member ...]]
  summary: Returns members from a geospatial index as geohash strings.
  since: 3.2.0

  GEOPOS key [member [member ...]]
  summary: Returns the longitude and latitude of members from a geospatial index.
  since: 3.2.0

  GEORADIUS key longitude latitude radius M|KM|FT|MI [WITHCOORD] [WITHDIST] [WITHHASH] [COUNT count [ANY]] [ASC|DESC] [STORE key|STOREDIST key]
  summary: Queries a geospatial index for members within a distance from a coordinate, optionally stores the result.
  since: 3.2.0

  GEORADIUSBYMEMBER key member radius M|KM|FT|MI [WITHCOORD] [WITHDIST] [WITHHASH] [COUNT count [ANY]] [ASC|DESC] [STORE key|STOREDIST key]
  summary: Queries a geospatial index for members within a distance from a member, optionally stores the result.
  since: 3.2.0

  GEORADIUSBYMEMBER_RO key member radius M|KM|FT|MI [WITHCOORD] [WITHDIST] [WITHHASH] [COUNT count [ANY]] [ASC|DESC]
  summary: Returns members from a geospatial index that are within a distance from a member.
  since: 3.2.10

  GEORADIUS_RO key longitude latitude radius M|KM|FT|MI [WITHCOORD] [WITHDIST] [WITHHASH] [COUNT count [ANY]] [ASC|DESC]
  summary: Returns members from a geospatial index that are within a distance from a coordinate.
  since: 3.2.10

  GEOSEARCH key FROMMEMBER member|FROMLONLAT longitude latitude BYRADIUS radius M|KM|FT|MI|BYBOX width height M|KM|FT|MI [ASC|DESC] [COUNT count [ANY]] [WITHCOORD] [WITHDIST] [WITHHASH]
  summary: Queries a geospatial index for members inside an area of a box or a circle.
  since: 6.2.0

  GEOSEARCHSTORE destination source FROMMEMBER member|FROMLONLAT longitude latitude BYRADIUS radius M|KM|FT|MI|BYBOX width height M|KM|FT|MI [ASC|DESC] [COUNT count [ANY]] [STOREDIST]
  summary: Queries a geospatial index for members inside an area of a box or a circle, optionally stores the result.
  since: 6.2.0

```

## 第一步：安装依赖

在 NestJS 项目中，我们一般使用原生支持 Promise 且健壮的 `ioredis` 客户端。

```bash
npm install ioredis
npm install @types/ioredis -D
```

## 第二步：配置并连接 Redis

在全局模块中创建一个基于 `ioredis` 实例的基础连接 Provider：

```typescript
// src/redis/redis.module.ts
import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: '127.0.0.1',
          port: 6379,
          // password: 'your_password' // 如果有设置认证需开放
        });
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
```

## 第三步：实现门店与附近的搜索业务

我们可以封装一个 `StoreLocationService`。这个服务负责处理新店加入时的坐标录入，以及用户想查找附近门店时的逻辑。

```typescript
// src/location/store-location.service.ts
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class StoreLocationService {
  private readonly GEO_KEY = 'locations:stores'; // 存热门门店坐标的 key

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * 将新开门店加入地图网格中
   * @param storeId 门店唯一标识
   * @param lng 经度
   * @param lat 纬度
   */
  async addStore(storeId: string, lng: number, lat: number) {
    // geoadd 支持多参数插入，此处演示单点插入
    // redis.geoadd(key, longitude, latitude, member)
    const result = await this.redis.geoadd(this.GEO_KEY, lng, lat, storeId);
    return result;
  }

  /**
   * 获取特定两家门店之间的直线距离
   * @param store1
   * @param store2
   */
  async getDistance(store1: string, store2: string) {
    // 获得相距的公里数 'km'
    const dist = await this.redis.geodist(this.GEO_KEY, store1, store2, 'km');
    return dist;
  }

  /**
   * 基于用户当前坐标，寻找附近的门店
   * @param userLng 用户当前坐标：经度
   * @param userLat 用户当前坐标：纬度
   * @param radius 查找半径
   */
  async getNearbyStores(userLng: number, userLat: number, radius: number = 5) {
    // 在 ioredis(Redis >= 6.2) 中，推荐使用 geosearch 代替淘汰的 georadius
    // 并搭配一些常用的提取项，比如带上它们彼此的距离，带上坐标并返回升序。
    const result = await this.redis.geosearch(
      this.GEO_KEY,
      'FROMLONLAT', userLng, userLat, // 以提供的经纬度为正中心
      'BYRADIUS', radius, 'km',       // 设置搜索半径的圈
      'WITHDIST',                     // 返回值中同时附带上它和中心的距离
      'WITHCOORD',                    // 返回值附带这个 member 本身的真实坐标参数
      'ASC'                           // 距离从近到远升序排序（核心需求）
    );

    // 返回的数据是一个嵌套数组：
    // [ [ 'store101', '1.2345', ['113.123', '23.321'] ], [ 'store202', '3.456', ... ] ]

    // 我们可以将其映射包装成友好的 JSON
    return (result as any[]).map((item) => ({
      storeId: item[0],
      distanceKm: parseFloat(item[1]),
      coordinate: {
        lng: parseFloat(item[2][0]),
        lat: parseFloat(item[2][1])
      }
    }));
  }
}
```

## 第四步：在 Controller 提供 HTTP 接口

```typescript
// src/location/store-location.controller.ts
import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { StoreLocationService } from './store-location.service';

@Controller('location')
export class StoreLocationController {
  constructor(private readonly locationService: StoreLocationService) {}

  @Post('store')
  async createStore(@Body() body: { storeId: string; lng: number; lat: number }) {
    await this.locationService.addStore(body.storeId, body.lng, body.lat);
    return { message: '门店坐标录入成功' };
  }

  @Get('nearby')
  async getNearby(
    @Query('lng') lng: string,
    @Query('lat') lat: string,
    @Query('radius') radius: string
  ) {
    const stores = await this.locationService.getNearbyStores(
      parseFloat(lng),
      parseFloat(lat),
      radius ? parseInt(radius, 10) : 5
    );
    return { data: stores };
  }
}
```

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 为什么不用 GEORADIUS 而是使用 GEOSEARCH？</h4>💬点击展开/收起</summary>

在早期版本中，大家都习惯使用 `GEORADIUS` 和 `GEORADIUSBYMEMBER`。到了 **Redis 6.2** 后，官方将这两个指令整合并废弃标记，正式推出了全新的 **`GEOSEARCH`** 与 **`GEOSEARCHSTORE`**。

新指令不仅覆盖了老指令所有的圆心半径周边查找的逻辑，还引入了额外的矩形盒子（Box）范围内的过滤：也就是增加了一个全新的属性 `'BYBOX', width, height, unit`，非常适合那些“滑动地图视口内返回数据”的新型业务需求。

因此，新代码一律首选 `GEOSEARCH`。

</details>

<!-- #endregion -->

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 那么 Redis 的 GEO 会遇到什么性能和删除问题的瓶颈吗？</h4>💬点击展开/收起</summary>

Redis 的 GEO 因为其底层依然使用了 **Sorted Set(ZSET)**，因此同样支持 `ZREM` 这个命令来进行对应记录的坐标点的定点删除。

**性能和管理上的陷阱：**
1. 正因为是 `ZSET` 这个 O(log(N)) 复杂度的大结构，当网格里面含有成百万上千万级别的地理位置数据时，针对单个 `key` 进行大规模的空间查找或者整体清理等都会成为阻塞业务流的性能开销瓶颈。
2. 因此，业界千万不要仅仅只存到一个单一的 `locations:stores` 的 key 里面。
3. 好的实践是要根据业务情况去**切割 key 的粒度**进行空间隔离，比如把大 Key 切割并根据城市的名称后缀处理为 `locations:stores:beijing`、`locations:stores:shanghai`…… 大大减少 Redis 热点 Key 命中阻塞。

</details>

<!-- #endregion -->
