import { Base } from 'base';

const Slot1 = () => {
  return <p>p from sub slot1</p>;
};

const Slot2 = () => {
  return <p>p from sub slot2</p>;
};

export const Sub = () => {
  return <Base slot1={Slot1} slot2={Slot2} />;
};
