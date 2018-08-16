import { SerializeFunction, deserialize } from '../common/SerializeFunction';
import { registerHandler } from '../common/handler';
import { PartitionType } from '../common/types';

export const INIT = '@@worker/init';
export const EXIT = '@@worker/exit';

export const CREATE_PARTITION = '@@worker/createPartition';
export const REDUCE = '@@worker/reduce';
export const RELEASE = '@@worker/release';

let wid = 'NO-ID'; // workerId

registerHandler(INIT, (_id: string) => {
  wid = _id;
  console.log(`Worker ${wid} inited.`);
});

registerHandler(EXIT, () => {
  console.log(`Worker ${wid} exited`);
  process.exit(0);
});

const partitions: { [key: string]: any[] } = {};
let idCounter = 0;

registerHandler(
  CREATE_PARTITION,
  ({
    type,
    creator,
    count,
    args,
  }: {
    type: PartitionType;
    creator: SerializeFunction;
    count: number;
    args: any[];
  }) => {
    const func = deserialize(creator);
    const ret: string[] = [];
    for (let i = 0; i < count; i++) {
      const id = `rdd-${++idCounter}`;
      partitions[id] = func(args[i]);
      ret.push(id);
    }
    return ret;
  },
);

registerHandler(
  REDUCE,
  ({ ids, func }: { ids: string[]; func: SerializeFunction }) => {
    const f = deserialize(func);
    return ids.map(id => f(partitions[id]));
  },
);

registerHandler(RELEASE, (ids: string[]) => {
  for (const id of ids) {
    delete partitions[id];
  }
});
