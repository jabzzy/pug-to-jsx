export const Base = ({ slot1: Slot1, slot2: Slot2 }) => {
    return (
        <>
            <p>some text from base</p>
            <Slot1 />
            <p>some more text from base</p>
            <Slot2 />
        </>
    );
};
