export const FallThrough = () => {
  var friends = 10;
  return <>{(() => {
      switch (friends) {
        case 0:
        case 1:
          return <><p>you have very few friends</p></>;

        default:
          return <><p>you have friends</p></>;
      }
    })()}</>;
};
