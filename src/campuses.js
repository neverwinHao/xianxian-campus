window.CAMPUSES = {
  "north": {
    "id": "north",
    "name": "北校区",
    "number": "01",
    "width": 280,
    "depth": 230,
    "boundary": [
      [
        -140,
        -115
      ],
      [
        140,
        -115
      ],
      [
        140,
        115
      ],
      [
        -130,
        115
      ],
      [
        -140,
        98
      ]
    ],
    "road": {
      "axis": "x",
      "x": 0,
      "z": 139,
      "length": 440,
      "label": "学 府 大 街"
    },
    "gate": {
      "x": 22,
      "z": 115,
      "rotation": 3.141592653589793
    },
    "buildings": [
      {
        "id": "north-west",
        "name": "北部西楼",
        "x": -73,
        "z": -93,
        "w": 112,
        "d": 22,
        "h": 22,
        "kind": "building",
        "profile": "northPlain",
        "roofPanels": true,
        "closeFace": "south",
        "labelPriority": 1
      },
      {
        "id": "north-east",
        "name": "北部东楼",
        "x": 56,
        "z": -93,
        "w": 114,
        "d": 20,
        "h": 22,
        "kind": "building",
        "profile": "northPlain",
        "roofPanels": true,
        "closeFace": "south",
        "labelPriority": 1
      },
      {
        "id": "middle-west",
        "name": "A部宿舍",
        "x": -76,
        "z": -12,
        "w": 106,
        "d": 25,
        "h": 21,
        "kind": "building",
        "profile": "northPlain",
        "roofPanels": false,
        "closeFace": "south",
        "labelPriority": 1
      },
      {
        "id": "middle-east",
        "name": "B部宿舍",
        "x": 60,
        "z": -12,
        "w": 108,
        "d": 23,
        "h": 21,
        "kind": "building",
        "profile": "northTeaching",
        "roofPanels": true,
        "closeFace": "south",
        "labelPriority": 1
      },
      {
        "id": "south-west",
        "name": "A部教学楼",
        "x": -77,
        "z": 50,
        "w": 103,
        "d": 24,
        "h": 21,
        "kind": "building",
        "profile": "northTeaching",
        "roofPanels": true,
        "endTowers": true,
        "closeFace": "south",
        "labelPriority": 1
      },
      {
        "id": "south-east",
        "name": "B部教学楼",
        "x": 61,
        "z": 48,
        "w": 110,
        "d": 25,
        "h": 21,
        "kind": "building",
        "profile": "northTeaching",
        "roofPanels": true,
        "endTowers": true,
        "closeFace": "south",
        "labelPriority": 1
      },
      {
        "id": "b-canteen",
        "name": "B部食堂",
        "x": 49,
        "z": -51,
        "w": 54,
        "d": 25,
        "h": 10.8,
        "kind": "building",
        "roofColor": 4746641,
        "profile": "northCanteen",
        "roofPanels": false,
        "labelPriority": 1,
        "closeFace": "south"
      },
      {
        "id": "a-canteen",
        "name": "A部食堂",
        "x": -76,
        "z": -51,
        "w": 54,
        "d": 25,
        "h": 10.8,
        "kind": "building",
        "profile": "northCanteen",
        "labelPriority": 1,
        "roofPanels": false,
        "closeFace": "south"
      }
    ],
    "fields": [],
    "courts": [],
    "gardens": [
      [
        -77,
        87,
        89,
        29
      ],
      [
        79,
        87,
        63,
        28
      ],
      [
        0,
        28,
        35,
        17
      ],
      [
        -27,
        -43,
        27,
        58
      ]
    ],
    "roads": [
      [
        -18,
        0,
        10,
        215
      ],
      [
        0,
        -78,
        260,
        8
      ],
      [
        0,
        106,
        252,
        7
      ],
      [
        131,
        0,
        7,
        220
      ],
      [
        -130,
        0,
        7,
        210
      ],
      [
        22,
        86,
        12,
        53
      ]
    ],
    "places": [
      {
        "id": "gate",
        "name": "校门",
        "kind": "landscape",
        "x": 22,
        "z": 115,
        "h": 1,
        "labelPriority": 1
      },
      {
        "id": "observatory",
        "name": "教学楼顶天文圆顶",
        "kind": "landscape",
        "x": 65,
        "z": 51,
        "h": 33
      },
      {
        "id": "axis",
        "name": "校园中轴",
        "kind": "landscape",
        "x": -18,
        "z": 34,
        "h": 1
      },
      {
        "id": "garden",
        "name": "左侧连廊",
        "kind": "landscape",
        "x": -79,
        "z": 90,
        "h": 6,
        "w": 82,
        "d": 29,
        "labelPriority": 1
      },
      {
        "id": "sculpture",
        "name": "右侧雕塑",
        "kind": "landscape",
        "x": 80,
        "z": 88,
        "h": 12.5,
        "w": 22,
        "d": 22,
        "labelPriority": 1
      },
      {
        "id": "courtyard",
        "name": "教学楼连廊与院落",
        "kind": "landscape",
        "x": 64,
        "z": 23,
        "h": 13
      }
    ],
    "tour": [
      "gate",
      "garden",
      "sculpture",
      "south-west",
      "south-east",
      "middle-west",
      "middle-east",
      "a-canteen",
      "b-canteen"
    ],
    "observatory": {
      "x": 65,
      "z": 51,
      "w": 15,
      "d": 16,
      "h": 25.5
    },
    "connectors": [
      {
        "x": -121,
        "z": 19,
        "w": 9,
        "d": 62,
        "h": 12.5
      },
      {
        "x": 64,
        "z": 18,
        "w": 9,
        "d": 60,
        "h": 12.5
      }
    ],
    "coveredWalk": {
      "points": [
        [
          -44,
          83
        ],
        [
          -61,
          83
        ],
        [
          -61,
          97
        ],
        [
          -91,
          97
        ],
        [
          -91,
          83
        ],
        [
          -114,
          83
        ]
      ],
      "width": 4.8
    },
    "sculpture": {
      "x": 80,
      "z": 88,
      "h": 12.5,
      "w": 9,
      "d": 7
    },
    "displayIds": [
      "gate",
      "garden",
      "sculpture",
      "south-west",
      "south-east",
      "middle-west",
      "middle-east",
      "a-canteen",
      "b-canteen"
    ],
    "selectionAliases": {
      "observatory": "south-east",
      "courtyard": "south-east"
    }
  },
  "south": {
    "id": "south",
    "name": "南校区",
    "number": "02",
    "width": 280,
    "depth": 300,
    "boundary": [
      [
        -138,
        -150
      ],
      [
        0,
        -150
      ],
      [
        0,
        -72
      ],
      [
        138,
        -72
      ],
      [
        138,
        150
      ],
      [
        -138,
        150
      ]
    ],
    "road": {
      "axis": "x",
      "x": 0,
      "z": -171,
      "length": 440,
      "label": "学 府 大 街"
    },
    "gate": {
      "x": -7,
      "z": -149,
      "rotation": 0
    },
    "buildings": [
      {
        "id": "north-building",
        "name": "科技楼",
        "x": -82,
        "z": -119,
        "w": 100,
        "d": 21,
        "h": 17.5,
        "kind": "building",
        "profile": "southScience",
        "roofName": "献中科技楼",
        "closeFace": "north",
        "labelPriority": 1
      },
      {
        "id": "court-north",
        "name": "教学楼",
        "x": -76,
        "z": -62,
        "w": 96,
        "d": 53,
        "h": 20,
        "kind": "building",
        "courtyard": true,
        "profile": "southTeaching",
        "labelPriority": 1,
        "wing": 10,
        "ginkgo": true,
        "closeFace": "east"
      },
      {
        "id": "dorm-west",
        "name": "宿舍楼（西侧）",
        "x": -84,
        "z": 6,
        "w": 80,
        "d": 53,
        "h": 20,
        "kind": "building",
        "courtyard": true,
        "profile": "southDorm",
        "labelPriority": 10,
        "wing": 10,
        "floors": 4,
        "closeFace": "east"
      },
      {
        "id": "dorm-east",
        "name": "宿舍楼（东侧）",
        "x": -13,
        "z": 6,
        "w": 18,
        "d": 64,
        "h": 13.5,
        "kind": "building",
        "profile": "southDorm",
        "labelPriority": 10,
        "floors": 3,
        "closeFace": "east"
      },
      {
        "id": "canteen",
        "name": "食堂",
        "x": -65,
        "z": 78,
        "w": 60,
        "d": 37,
        "h": 13,
        "kind": "building",
        "profile": "southCanteen",
        "labelPriority": 9,
        "closeFace": "east"
      },
      {
        "id": "library",
        "name": "图书馆",
        "x": -65,
        "z": 131,
        "w": 70,
        "d": 24,
        "h": 25,
        "kind": "building",
        "profile": "southLibrary",
        "closeFace": "north"
      },
      {
        "id": "east-building",
        "name": "东北场边楼",
        "x": 120,
        "z": -46,
        "w": 18,
        "d": 42,
        "h": 9,
        "kind": "building",
        "profile": "gray",
        "closeFace": "east"
      }
    ],
    "fields": [
      {
        "id": "track",
        "name": "操场",
        "kind": "sport",
        "x": 69,
        "z": 39,
        "r": 43,
        "straight": 103,
        "h": 1,
        "labelPriority": 1
      }
    ],
    "courts": [],
    "gardens": [
      [
        -72,
        49,
        78,
        17
      ],
      [
        -60,
        108,
        72,
        15
      ]
    ],
    "roads": [
      [
        -18,
        -102,
        13,
        88
      ],
      [
        -9,
        -55,
        12,
        21
      ],
      [
        -14,
        -63,
        21,
        9
      ],
      [
        4,
        16,
        10,
        142
      ],
      [
        -2,
        -48,
        18,
        10
      ],
      [
        -76,
        -31,
        112,
        6
      ],
      [
        -33,
        7,
        10,
        70
      ],
      [
        -76,
        48,
        112,
        8
      ],
      [
        -74,
        -96,
        112,
        8
      ],
      [
        -135,
        3,
        4,
        277
      ],
      [
        -13,
        104,
        13,
        70
      ],
      [
        -43,
        110,
        73,
        7
      ],
      [
        0,
        147,
        254,
        6
      ]
    ],
    "places": [
      {
        "id": "gate",
        "name": "校门",
        "kind": "landscape",
        "x": -7,
        "z": -150,
        "h": 25.2,
        "labelPriority": 1
      },
      {
        "id": "garden",
        "name": "院间绿地",
        "kind": "landscape",
        "x": -75,
        "z": 49,
        "h": 1
      },
      {
        "id": "pavilion",
        "name": "门内双层六角亭",
        "kind": "landscape",
        "x": -62,
        "z": -139,
        "h": 12.5,
        "w": 12,
        "d": 12
      },
      {
        "id": "ginkgo-court",
        "name": "教学楼银杏天井",
        "kind": "landscape",
        "x": -76,
        "z": -62,
        "h": 12,
        "w": 64,
        "d": 28
      }
    ],
    "tour": [
      "gate",
      "north-building",
      "track",
      "court-north"
    ],
    "pavilion": {
      "x": -62,
      "z": -139,
      "r": 4.5,
      "h": 12.5
    },
    "displayIds": [
      "gate",
      "north-building",
      "track",
      "court-north"
    ]
  }
};
