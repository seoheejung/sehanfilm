
/* _v : 세로, _h : 가로 */
const shots = {
    verticalShot: [
        { left: 56, top: 85 },
        { left: 655, top: 85 },
        { left: 56, top: 885 },
        { left: 655, top: 885 },
    ],
    horizontalShot: [
        { left: 51, top: 61 },
        { left: 854, top: 61 },
        { left: 51, top: 669 },
        { left: 854, top: 669 },
    ],
    film_frame_v: [
        { left: 56, top: 85 },
        { left: 655, top: 85 },
        { left: 56, top: 885 },
        { left: 655, top: 885 },
    ],
    film_frame_h: [
        { left: 51, top: 61 },
        { left: 836, top: 61 },
        { left: 51, top: 669 },
        { left: 836, top: 669 },
    ],
    gosim_frame_v: [
        { left: 56, top: 275 },
        { left: 655, top: 275 },
        { left: 56, top: 1075 },
        { left: 655, top: 1075 },
    ],
    gosim_frame_h: [
        { left: 371, top: 61 },
        { left: 1126, top: 61 },
        { left: 51, top: 669 },
        { left: 806, top: 669 },
    ],
    lovekeykey_frame_v: [
        { left: 56, top: 85 },
        { left: 655, top: 85 },
        { left: 56, top: 885 },
        { left: 655, top: 885 },
    ],
    lovekeykey_frame_h: [
        { left: 51, top: 61 },
        { left: 836, top: 61 },
        { left: 51, top: 669 },
        { left: 836, top: 669 },
    ]
};

const overlay = {
    gosim_frame_v:
        { left: 23, top: 940 },
    gosim_frame_h: 
        { left: 157, top: 4 },
    lovekeykey_frame_v: 
        { left: 8, top: 24 },
    lovekeykey_frame_h: 
        { left: 25, top: 11 },
}

const lovekeykeyArt = [
    { left: 30, top: 51 },
    { left: 304, top: 1522},
    { left: 572, top: 728 },
    { left: 1106, top: 760 },
]

export { shots, overlay };
