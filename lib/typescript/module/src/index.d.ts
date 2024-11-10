type CallbackType = (heading: number, accuracy: number) => void;
declare const CompassHeadingModule: {
    start: (degreeUpdateRate: number, callback: CallbackType) => void;
    stop: () => void;
};
export default CompassHeadingModule;
//# sourceMappingURL=index.d.ts.map