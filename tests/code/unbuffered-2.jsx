export const Unbuffered2 = () => {
  var list = ["Uno", "Dos", "Tres", "Cuatro", "Cinco", "Seis"];
  return <>{list.map(item => <><li>{item}</li></>)}</>;
};
