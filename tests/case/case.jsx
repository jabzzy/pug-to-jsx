export const Case = () => {
  var friends = 10;
  return <>{(() => {
      switch (friends) {
        case 0:
          return <><p>you have no friends</p></>;

        case 1:
          return <><p>you have a friend</p></>;

        default:
          return <><p>you have friends</p></>;
      }
    })()}</>;
};
