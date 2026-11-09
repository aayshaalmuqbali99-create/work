/**
 * Illustrative 3D models — one per TYPE of device, built from simple shapes.
 *
 * IMPORTANT: these show the typical components of a device type for teaching purposes.
 * They are NOT scans or CAD models of the actual inventory units, and the UI always labels them
 * "Illustrative model". A verified GLB model of the real unit can replace them later (Phase 6).
 *
 * Coordinates: y is up, the front of the device faces +z.
 */
import type { Archetype, MeshSpec, PartSpec, V3 } from "./types";
import { C, box, cone, cyl, grid, torus } from "./shapes";

/* ---------- shared building blocks for bench instruments ---------- */

function benchShell(w: number, h: number, d: number): PartSpec[] {
  return [
    {
      id: "cover", en: "Outer cover", ar: "الغطاء الخارجي",
      fnEn: "Metal U-shaped cover that protects the internal circuits and shields them from interference.",
      fnAr: "غطاء معدني على شكل U يحمي الدوائر الداخلية ويعزلها عن التداخل.",
      meshes: [
        box([w, 0.05, d], [0, h / 2, 0], C.case, { metal: 0.3 }),
        box([0.05, h, d], [-w / 2, 0, 0], C.case, { metal: 0.3 }),
        box([0.05, h, d], [w / 2, 0, 0], C.case, { metal: 0.3 }),
      ],
      explode: [0, 1.6, 0],
    },
    {
      id: "chassis", en: "Chassis and rear panel", ar: "الهيكل واللوحة الخلفية",
      fnEn: "Internal frame that holds all parts in place; the rear panel carries the mains inlet and fuse.",
      fnAr: "الإطار الداخلي الذي يثبت جميع الأجزاء؛ وتحمل اللوحة الخلفية مدخل الكهرباء والمصهر.",
      meshes: [
        box([w - 0.1, 0.05, d], [0, -h / 2, 0], C.metal, { metal: 0.6 }),
        box([w - 0.1, h - 0.1, 0.05], [0, 0, -d / 2], C.metal, { metal: 0.6 }),
        box([0.3, 0.2, 0.06], [w / 2 - 0.4, -h / 2 + 0.25, -d / 2 - 0.04], C.black),
      ],
      explode: [0, -1.3, -0.4],
    },
  ];
}

function frontPanel(w: number, h: number, d: number, color: string = C.panel): PartSpec {
  return {
    id: "front-panel", en: "Front panel", ar: "اللوحة الأمامية",
    fnEn: "Holds the display, controls and connectors that the user operates.",
    fnAr: "تحمل الشاشة وأزرار التحكم والموصلات التي يستخدمها المستخدم.",
    meshes: [box([w, h, 0.07], [0, 0, d / 2 + 0.035], color)],
    explode: [0, 0, 1.3],
  };
}

const knob = (p: V3, r = 0.13): MeshSpec => cyl(r, 0.14, p, C.dark, "z");

function mainBoard(w: number, h: number, d: number, en = "Main circuit board", ar = "اللوحة الإلكترونية الرئيسية"): PartSpec {
  const y = -h / 2 + 0.12;
  return {
    id: "main-board", en, ar,
    fnEn: "Printed circuit board carrying the electronic components that generate, process or measure the signals.",
    fnAr: "لوحة دوائر مطبوعة تحمل المكونات الإلكترونية التي تولّد الإشارات أو تعالجها أو تقيسها.",
    meshes: [
      box([w * 0.55, 0.04, d * 0.7], [w * 0.15, y, 0], C.pcb),
      ...grid(3, 2, [w * 0.15 - 0.35, y + 0.06, -0.3], [0.35, 0.5], "xz", (p) => box([0.22, 0.06, 0.16], p, C.chip)),
      cyl(0.07, 0.2, [w * 0.15 + 0.45, y + 0.12, 0.35], C.blue),
    ],
    explode: [0.9, 0.9, 0],
  };
}

function powerUnit(w: number, h: number, d: number): PartSpec {
  const x = -w / 2 + 0.55;
  return {
    id: "power-unit", en: "Power supply section", ar: "قسم مزود الطاقة",
    fnEn: "Transformer and regulator that convert mains electricity into the low voltages the circuits need.",
    fnAr: "المحول والمنظم اللذان يحوّلان كهرباء الشبكة إلى الجهود المنخفضة التي تحتاجها الدوائر.",
    meshes: [
      box([0.6, 0.55, 0.5], [x, -h / 2 + 0.33, -d / 2 + 0.5], C.metal, { metal: 0.7 }),
      cyl(0.24, 0.42, [x, -h / 2 + 0.33, -d / 2 + 0.5], C.copper, "x", { metal: 0.6 }),
    ],
    explode: [-1.3, 0.5, -0.3],
  };
}

/* ---------- device types ---------- */

const W = 3, H = 1.3, D = 2.4;

const powerSupply: Archetype = {
  key: "power-supply", en: "Bench power supply", ar: "مزود طاقة مختبري", size: 3.4,
  parts: [
    ...benchShell(W, H, D),
    frontPanel(W, H, D),
    {
      id: "meters", en: "Voltage & current displays", ar: "شاشات الجهد والتيار",
      fnEn: "Show the output voltage and current so the user can set and monitor them.",
      fnAr: "تعرض جهد وتيار الخرج ليتمكن المستخدم من ضبطهما ومراقبتهما.",
      meshes: [
        box([0.8, 0.38, 0.06], [-0.75, 0.3, D / 2 + 0.1], C.screen, { emissive: "#7a1d14" }),
        box([0.8, 0.38, 0.06], [0.45, 0.3, D / 2 + 0.1], C.screen, { emissive: "#7a1d14" }),
      ],
      explode: [0, 0.3, 2.1], parent: "front-panel",
    },
    {
      id: "controls", en: "Voltage & current controls", ar: "مقابض ضبط الجهد والتيار",
      fnEn: "Rotary knobs that adjust the output voltage and the current limit.",
      fnAr: "مقابض دوارة لضبط جهد الخرج وحد التيار.",
      meshes: [knob([-1.0, -0.25, D / 2 + 0.11]), knob([-0.5, -0.25, D / 2 + 0.11]), knob([0.2, -0.25, D / 2 + 0.11]), knob([0.7, -0.25, D / 2 + 0.11])],
      explode: [0, -0.1, 2.6], parent: "front-panel",
    },
    {
      id: "terminals", en: "Output terminals", ar: "أطراف الخرج",
      fnEn: "Red (+) and black (−) binding posts where the circuit under test is connected.",
      fnAr: "أطراف توصيل حمراء (+) وسوداء (−) تُوصل بها الدائرة المراد تغذيتها.",
      meshes: [cyl(0.07, 0.18, [1.15, -0.25, D / 2 + 0.12], C.red, "z"), cyl(0.07, 0.18, [1.35, -0.25, D / 2 + 0.12], C.black, "z"), cyl(0.07, 0.18, [1.15, 0.25, D / 2 + 0.12], C.red, "z"), cyl(0.07, 0.18, [1.35, 0.25, D / 2 + 0.12], C.black, "z")],
      explode: [0.6, -0.4, 2.3], parent: "front-panel",
    },
    {
      id: "transformer", en: "Mains transformer", ar: "محوّل الشبكة",
      fnEn: "Steps the mains voltage down and isolates the output from the mains supply.",
      fnAr: "يخفض جهد الشبكة ويعزل الخرج عن مصدر الكهرباء الرئيسي.",
      meshes: [box([0.75, 0.7, 0.6], [-0.85, -0.25, -0.35], C.metal, { metal: 0.7 }), cyl(0.3, 0.5, [-0.85, -0.25, -0.35], C.copper, "x", { metal: 0.6 })],
      explode: [-1.5, 0.6, -0.3],
    },
    {
      id: "regulator-board", en: "Regulator circuit board", ar: "لوحة دائرة التنظيم",
      fnEn: "Rectifies, smooths and regulates the voltage so the output stays stable under load.",
      fnAr: "تقوم بتقويم الجهد وتنعيمه وتنظيمه ليبقى الخرج مستقراً مع تغير الحمل.",
      meshes: [box([1.3, 0.04, 1.4], [0.6, -0.5, -0.1], C.pcb), cyl(0.12, 0.3, [0.3, -0.33, -0.3], C.blue), cyl(0.12, 0.3, [0.65, -0.33, -0.3], C.blue), box([0.25, 0.08, 0.2], [0.9, -0.44, 0.2], C.chip)],
      explode: [1.3, 0.8, 0],
    },
    {
      id: "heatsink", en: "Heatsink", ar: "المشتت الحراري",
      fnEn: "Aluminium fins that remove heat from the power transistors.",
      fnAr: "زعانف ألمنيوم تبدد الحرارة الناتجة عن ترانزستورات القدرة.",
      meshes: grid(6, 1, [0.3, 0, -D / 2 - 0.1], [0.14, 0], "xy", (p) => box([0.05, 0.9, 0.2], p, C.metal, { metal: 0.8 })),
      explode: [0, 0, -1.5],
    },
  ],
};

const oscilloscope: Archetype = {
  key: "oscilloscope", en: "Analogue oscilloscope", ar: "راسم إشارة تناظري", size: 3.6,
  parts: [
    ...benchShell(W, 1.6, 2.8),
    frontPanel(W, 1.6, 2.8),
    {
      id: "crt", en: "Cathode-ray tube (CRT) and screen", ar: "أنبوب الأشعة المهبطية (CRT) والشاشة",
      fnEn: "An electron beam draws the signal on the phosphor screen; the graticule grid is used to measure it.",
      fnAr: "يرسم شعاع الإلكترونات الإشارة على الشاشة الفسفورية، وتُستخدم الشبكة المدرّجة لقياسها.",
      meshes: [box([1.1, 0.85, 0.05], [-0.7, 0.2, 1.46], C.screen, { emissive: "#0f3b3a" }), cone(0.5, 0.12, 1.9, [-0.7, 0.2, 0.4], "#26343c", "z")],
      explode: [-0.6, 0.3, 2.4], parent: "front-panel",
    },
    {
      id: "controls", en: "Time-base & volts/div controls", ar: "مقابض قاعدة الزمن وفولت/قسم",
      fnEn: "Set the vertical scale (volts per division) and horizontal scale (time per division).",
      fnAr: "تضبط المقياس الرأسي (فولت لكل قسم) والمقياس الأفقي (زمن لكل قسم).",
      meshes: grid(3, 2, [0.3, 0.45, 1.5], [0.38, 0.45], "xy", (p) => knob(p, 0.12)),
      explode: [0.5, 0.2, 2.6], parent: "front-panel",
    },
    {
      id: "inputs", en: "BNC input connectors", ar: "موصلات الإدخال BNC",
      fnEn: "Probe connectors for channel 1, channel 2 and external trigger.",
      fnAr: "موصلات المجسّات للقناة 1 والقناة 2 والقدح الخارجي.",
      meshes: [cyl(0.08, 0.16, [0.3, -0.55, 1.5], C.metal, "z", { metal: 0.9 }), cyl(0.08, 0.16, [0.75, -0.55, 1.5], C.metal, "z", { metal: 0.9 }), cyl(0.08, 0.16, [1.2, -0.55, 1.5], C.metal, "z", { metal: 0.9 })],
      explode: [0.6, -0.6, 2.4], parent: "front-panel",
    },
    mainBoard(W, 1.6, 2.8, "Vertical & horizontal amplifier board", "لوحة المكبر الرأسي والأفقي"),
    powerUnit(W, 1.6, 2.8),
  ],
};

const benchInstrument: Archetype = {
  key: "bench-instrument", en: "Bench test instrument", ar: "جهاز قياس واختبار مختبري", size: 3.4,
  parts: [
    ...benchShell(W, H, D),
    frontPanel(W, H, D),
    {
      id: "display", en: "Display / meter", ar: "الشاشة / المؤشر",
      fnEn: "Shows the measured value or the generated signal settings.",
      fnAr: "تعرض القيمة المقاسة أو إعدادات الإشارة المولّدة.",
      meshes: [box([1.2, 0.5, 0.05], [-0.65, 0.22, D / 2 + 0.1], C.screen, { emissive: "#0f3b3a" })],
      explode: [-0.4, 0.4, 2.2], parent: "front-panel",
    },
    {
      id: "controls", en: "Keypad and control knobs", ar: "لوحة المفاتيح ومقابض التحكم",
      fnEn: "Used to select ranges, frequency, level and functions.",
      fnAr: "تُستخدم لاختيار النطاقات والتردد والمستوى والوظائف.",
      meshes: [...grid(3, 3, [0.35, 0.38, D / 2 + 0.09], [0.22, 0.2], "xy", (p) => box([0.15, 0.13, 0.06], p, C.dark)), knob([1.15, 0.2, D / 2 + 0.11], 0.18)],
      explode: [0.6, 0.3, 2.6], parent: "front-panel",
    },
    {
      id: "connectors", en: "Signal connectors", ar: "موصلات الإشارة",
      fnEn: "BNC sockets for signal inputs and outputs.",
      fnAr: "مقابس BNC لدخل وخرج الإشارة.",
      meshes: [cyl(0.08, 0.16, [-1.0, -0.38, D / 2 + 0.12], C.metal, "z", { metal: 0.9 }), cyl(0.08, 0.16, [-0.55, -0.38, D / 2 + 0.12], C.metal, "z", { metal: 0.9 }), cyl(0.08, 0.16, [0.9, -0.38, D / 2 + 0.12], C.metal, "z", { metal: 0.9 })],
      explode: [0, -0.6, 2.4], parent: "front-panel",
    },
    mainBoard(W, H, D),
    powerUnit(W, H, D),
  ],
};

/**
 * Training module in a clear acrylic case (layered like a real educational trainer):
 * printed front panel with controls on top, circuit board in the middle, acrylic case and base below.
 */
const PW = 3.0, PD = 2.2;
const trainingBoard: Archetype = {
  key: "training-board", en: "Training module / trainer board", ar: "وحدة / لوحة تدريبية", size: 3.4,
  parts: [
    {
      id: "front-panel", en: "Front panel (printed circuit diagram)", ar: "اللوحة الأمامية (مخطط الدائرة المطبوع)",
      fnEn: "Shows the circuit diagram so students can see what each socket, knob and test point connects to.",
      fnAr: "تعرض مخطط الدائرة ليعرف الطالب ما يتصل به كل مقبس ومقبض ونقطة اختبار.",
      meshes: [box([PW, 0.04, PD], [0, 0.42, 0], C.panel, { texture: "panel" }), box([0.9, 0.006, 0.5], [0.9, 0.443, -0.75], C.white, { texture: "label" })],
      explode: [0, 1.5, 0],
    },
    {
      id: "meter", en: "Analogue meter", ar: "مؤشر القياس التناظري",
      fnEn: "Shows a measured value (for example the output current) with a needle, so students can watch it change.",
      fnAr: "يعرض قيمة مقاسة (مثل تيار الخرج) بإبرة، ليرى الطالب تغيّرها مباشرة.",
      meshes: [box([0.75, 0.12, 0.55], [0.95, 0.5, 0.45], C.dark), box([0.66, 0.01, 0.46], [0.95, 0.565, 0.45], C.white, { texture: "meter" })],
      explode: [0.5, 2.6, 0.4], parent: "front-panel",
    },
    {
      id: "controls", en: "Knobs, variable resistor and switches", ar: "المقابض والمقاومة المتغيرة والمفاتيح",
      fnEn: "Adjust the circuit (frequency, level) and switch it on or off during experiments.",
      fnAr: "لضبط الدائرة (التردد والمستوى) وتشغيلها أو إطفاؤها أثناء التجارب.",
      meshes: [
        cyl(0.11, 0.12, [-1.05, 0.5, -0.35], C.dark), cyl(0.11, 0.12, [-0.2, 0.5, -0.35], C.dark),
        box([0.14, 0.1, 0.14], [-1.25, 0.49, 0.25], C.blue), box([0.07, 0.04, 0.07], [-1.25, 0.555, 0.25], C.white),
        box([0.34, 0.12, 0.2], [-0.95, 0.5, 0.85], C.black), box([0.12, 0.08, 0.12], [-0.3, 0.48, 0.55], C.dark), cyl(0.04, 0.04, [-0.3, 0.53, 0.55], C.red),
      ],
      explode: [-0.6, 2.4, 0.3], parent: "front-panel",
    },
    {
      id: "sockets", en: "4 mm sockets and test points", ar: "مقابس 4 مم ونقاط الاختبار",
      fnEn: "Where students plug leads to connect circuit stages, power and measuring instruments.",
      fnAr: "يوصل فيها الطلاب الأسلاك لربط مراحل الدائرة والتغذية وأجهزة القياس.",
      meshes: grid(7, 2, [-1.25, 0.47, -0.85], [0.33, 1.15], "xz", (p, i) => cyl(0.05, 0.08, p, [C.red, C.black, C.yellow, C.blue][i % 4])),
      explode: [0, 2.9, -0.2], parent: "front-panel",
    },
    {
      id: "connectors", en: "Antenna (BNC) and audio input", ar: "موصل الهوائي (BNC) ومدخل الصوت",
      fnEn: "Connect an antenna or test equipment, and feed an audio signal into the circuit.",
      fnAr: "لتوصيل هوائي أو أجهزة اختبار، وإدخال إشارة صوتية إلى الدائرة.",
      meshes: [cyl(0.08, 0.16, [1.25, 0.52, -0.25], C.metal, "y", { metal: 0.9, rough: 0.2 }), cyl(0.05, 0.06, [1.25, 0.62, -0.25], C.yellow, "y", { metal: 0.8 }), cyl(0.06, 0.1, [0.35, 0.49, 0.9], C.metal, "y", { metal: 0.9 })],
      explode: [1.0, 2.2, -0.3], parent: "front-panel",
    },
    {
      id: "speaker-grille", en: "Speaker grille", ar: "شبكة السماعة",
      fnEn: "Lets the sound from the loudspeaker underneath come out of the panel.",
      fnAr: "تسمح بخروج الصوت من السماعة الموجودة أسفل اللوحة.",
      meshes: [cyl(0.32, 0.03, [0.15, 0.455, -0.2], C.dark, "y", { texture: "grille" })],
      explode: [0.2, 2.0, -0.1], parent: "front-panel",
    },
    {
      id: "pcb", en: "Main circuit board (PCB)", ar: "اللوحة الإلكترونية الرئيسية (PCB)",
      fnEn: "The real circuit: copper tracks connect the soldered components that make the device work.",
      fnAr: "الدائرة الفعلية: مسارات نحاسية تربط المكونات الملحومة التي تُشغّل الجهاز.",
      meshes: [box([2.85, 0.035, 2.05], [0, 0.06, 0], C.pcb, { texture: "pcb" })],
      explode: [0, 0.45, 0],
    },
    {
      id: "components", en: "Electronic components (ICs, transistors, capacitors)", ar: "المكونات الإلكترونية (دوائر متكاملة، ترانزستورات، مكثفات)",
      fnEn: "Amplify, oscillate, filter and switch the signals — each one matches a symbol on the front panel.",
      fnAr: "تقوم بالتكبير والتذبذب والترشيح والتبديل — كل منها يقابل رمزاً على اللوحة الأمامية.",
      meshes: [
        ...grid(3, 2, [-1.0, 0.11, -0.65], [0.45, 0.5], "xz", (p) => box([0.3, 0.06, 0.14], p, C.chip)),
        ...grid(4, 2, [0.1, 0.14, 0.45], [0.22, 0.3], "xz", (p, i) => cyl(0.06, 0.13, p, i % 2 ? C.blue : "#1f3e8a")),
        ...grid(5, 1, [-1.1, 0.1, 0.75], [0.16, 0], "xz", () => box([0.1, 0.06, 0.04], [0, 0, 0], C.yellow)).map((m, i) => ({ ...m, pos: [-1.1 + i * 0.16, 0.1, 0.75] as V3 })),
        box([0.18, 0.12, 0.12], [-0.35, 0.14, -0.1], C.black), box([0.18, 0.12, 0.12], [-0.05, 0.14, -0.1], C.black),
      ],
      explode: [0, 0.95, 0.15], parent: "pcb",
    },
    {
      id: "heatsink", en: "Heat sink", ar: "المشتت الحراري",
      fnEn: "Aluminium fins that carry heat away from the output transistor.",
      fnAr: "زعانف ألمنيوم تبدد الحرارة الناتجة عن ترانزستور الخرج.",
      meshes: grid(8, 1, [0.55, 0.2, -0.55], [0.07, 0], "xz", (p) => box([0.035, 0.24, 0.5], p, C.metal, { metal: 0.85, rough: 0.3 })),
      explode: [0.7, 1.2, -0.5], parent: "pcb",
    },
    {
      id: "loudspeaker", en: "Loudspeaker", ar: "السماعة",
      fnEn: "Turns the electrical audio signal into sound so students can hear the result.",
      fnAr: "تحوّل الإشارة الصوتية الكهربائية إلى صوت ليسمع الطالب النتيجة.",
      meshes: [cyl(0.3, 0.12, [0.15, 0.16, -0.2], C.black), cone(0.26, 0.08, 0.06, [0.15, 0.24, -0.2], "#c9b27a"), cyl(0.06, 0.04, [0.15, 0.27, -0.2], C.dark)],
      explode: [-0.2, 1.05, -0.9], parent: "pcb",
    },
    {
      id: "acrylic-case", en: "Clear acrylic case", ar: "الصندوق الأكريليك الشفاف",
      fnEn: "Protects the circuit while keeping it visible, so students can see the real components inside.",
      fnAr: "يحمي الدائرة مع إبقائها ظاهرة، ليرى الطلاب المكونات الحقيقية بداخلها.",
      meshes: [
        box([PW, 0.03, PD], [0, -0.3, 0], C.glass, { glass: true }),
        box([PW, 0.7, 0.03], [0, 0.05, PD / 2], C.glass, { glass: true }), box([PW, 0.7, 0.03], [0, 0.05, -PD / 2], C.glass, { glass: true }),
        box([0.03, 0.7, PD], [PW / 2, 0.05, 0], C.glass, { glass: true }), box([0.03, 0.7, PD], [-PW / 2, 0.05, 0], C.glass, { glass: true }),
      ],
      explode: [0, -1.0, 0],
    },
    {
      id: "standoffs", en: "Standoffs and rubber feet", ar: "الأعمدة الفاصلة والأقدام المطاطية",
      fnEn: "Hold the board at a safe distance from the case and keep the unit stable on the bench.",
      fnAr: "تثبت اللوحة على مسافة آمنة من الصندوق وتحافظ على ثبات الجهاز على الطاولة.",
      meshes: [
        ...[[-1.3, -0.95], [1.3, -0.95], [-1.3, 0.95], [1.3, 0.95]].map(([x, z]) => cyl(0.04, 0.72, [x, 0.06, z], C.metal, "y", { metal: 0.9, rough: 0.25 })),
        ...[[-1.3, -0.95], [1.3, -0.95], [-1.3, 0.95], [1.3, 0.95]].map(([x, z]) => cyl(0.1, 0.06, [x, -0.35, z], C.black)),
      ],
      explode: [0, -1.6, 0],
    },
  ],
};

const telephone: Archetype = {
  key: "telephone", en: "Desktop telephone", ar: "هاتف مكتبي", size: 2.6,
  parts: [
    {
      id: "base", en: "Base housing", ar: "الهيكل الأساسي",
      fnEn: "Plastic body that holds the keypad, electronics and the handset cradle.",
      fnAr: "الهيكل البلاستيكي الذي يحمل لوحة الأرقام والإلكترونيات ومهد السماعة.",
      meshes: [box([2.0, 0.35, 1.6], [0, 0, 0], C.dark, { rot: [0.18, 0, 0] })],
      explode: [0, -1, 0],
    },
    {
      id: "handset", en: "Handset", ar: "السماعة",
      fnEn: "Contains the earpiece speaker and the microphone used during a call.",
      fnAr: "تحتوي على سماعة الأذن والميكروفون المستخدمَين أثناء المكالمة.",
      meshes: [box([0.35, 0.22, 1.5], [-0.75, 0.32, 0], C.dark), box([0.42, 0.26, 0.38], [-0.75, 0.32, 0.6], C.dark), box([0.42, 0.26, 0.38], [-0.75, 0.32, -0.6], C.dark)],
      explode: [-1.2, 1.2, 0],
    },
    {
      id: "keypad", en: "Keypad and feature keys", ar: "لوحة الأرقام ومفاتيح الميزات",
      fnEn: "Dialling keys plus programmable keys for transfer, hold and extensions.",
      fnAr: "مفاتيح الاتصال إضافة إلى مفاتيح قابلة للبرمجة للتحويل والانتظار والتحويلات الداخلية.",
      meshes: grid(3, 4, [0.0, 0.25, -0.1], [0.22, 0.22], "xz", (p) => box([0.16, 0.06, 0.16], p, C.panel)),
      explode: [0.3, 1.0, 0.5],
    },
    {
      id: "display", en: "Display", ar: "الشاشة",
      fnEn: "Shows the number dialled, caller information and menus.",
      fnAr: "تعرض الرقم المطلوب ومعلومات المتصل والقوائم.",
      meshes: [box([0.8, 0.04, 0.32], [0.35, 0.24, -0.55], C.screen, { emissive: "#0f3b3a", rot: [0.18, 0, 0] })],
      explode: [0.4, 1.3, -0.6],
    },
    {
      id: "main-board", en: "Telephone circuit board", ar: "لوحة دائرة الهاتف",
      fnEn: "Handles line signalling, speech circuits and the keypad.",
      fnAr: "تتولى إشارات الخط ودوائر الصوت ولوحة الأرقام.",
      meshes: [box([1.6, 0.03, 1.2], [0.1, -0.08, 0], C.pcb), box([0.3, 0.06, 0.3], [0.4, -0.04, 0.1], C.chip)],
      explode: [1.3, 0.2, 0],
    },
  ],
};

const networkUnit: Archetype = {
  key: "network-unit", en: "Telecom / power electronics unit", ar: "وحدة اتصالات / إلكترونيات قدرة", size: 3.2,
  parts: [
    {
      id: "enclosure", en: "Metal enclosure", ar: "الهيكل المعدني",
      fnEn: "Protects the electronics and allows mounting in a cabinet or rack.",
      fnAr: "يحمي الإلكترونيات ويسمح بتركيب الوحدة في خزانة أو حامل.",
      meshes: [box([3, 0.05, 2], [0, 0.5, 0], C.case, { metal: 0.4 }), box([0.05, 1, 2], [-1.5, 0, 0], C.case), box([0.05, 1, 2], [1.5, 0, 0], C.case)],
      explode: [0, 1.4, 0],
    },
    {
      id: "front-panel", en: "Front panel with ports", ar: "اللوحة الأمامية والمنافذ",
      fnEn: "Line ports, indicators and connectors for external equipment.",
      fnAr: "منافذ الخطوط والمؤشرات الضوئية والموصلات للأجهزة الخارجية.",
      meshes: [box([3, 1, 0.06], [0, 0, 1.03], C.panel), ...grid(8, 2, [-1.1, 0.15, 1.08], [0.24, 0.3], "xy", (p) => box([0.16, 0.13, 0.04], p, C.black)), cyl(0.04, 0.04, [1.2, 0.3, 1.08], "#2ecc71", "z", { emissive: "#2ecc71" })],
      explode: [0, 0, 1.3],
    },
    {
      id: "main-board", en: "Control / processing board", ar: "لوحة التحكم والمعالجة",
      fnEn: "Processor and interface circuits that switch calls or convert power.",
      fnAr: "المعالج ودوائر الواجهة التي تقوم بتحويل المكالمات أو تحويل الطاقة.",
      meshes: [box([2.6, 0.03, 1.7], [0, -0.42, 0], C.pcb), ...grid(4, 2, [-0.9, -0.36, -0.4], [0.6, 0.7], "xz", (p) => box([0.3, 0.07, 0.25], p, C.chip))],
      explode: [0, 0.6, 0.2],
    },
    {
      id: "heatsink", en: "Heatsink fins", ar: "زعانف التبريد",
      fnEn: "Carry heat away from power components to keep them within safe temperature.",
      fnAr: "تنقل الحرارة بعيداً عن مكونات القدرة لإبقائها ضمن درجة حرارة آمنة.",
      meshes: grid(8, 1, [-0.95, 0, -1.1], [0.27, 0], "xy", (p) => box([0.05, 0.8, 0.25], p, C.metal, { metal: 0.8 })),
      explode: [0, 0, -1.4],
    },
    {
      id: "base", en: "Base plate", ar: "القاعدة",
      fnEn: "Bottom plate that supports the boards.",
      fnAr: "الصفيحة السفلية التي تحمل اللوحات.",
      meshes: [box([3, 0.05, 2], [0, -0.5, 0], C.metal, { metal: 0.6 })],
      explode: [0, -1.1, 0],
    },
  ],
};

const solderingStation: Archetype = {
  key: "soldering-station", en: "Soldering / rework station", ar: "محطة لحام / إعادة عمل", size: 3.2,
  parts: [
    {
      id: "housing", en: "Station housing", ar: "هيكل المحطة",
      fnEn: "Body of the control unit that contains the transformer and control electronics.",
      fnAr: "جسم وحدة التحكم الذي يحتوي على المحول وإلكترونيات التحكم.",
      meshes: [box([1.4, 0.05, 1.6], [-0.6, 0.55, 0], C.dark), box([0.05, 1.1, 1.6], [-1.3, 0, 0], C.dark), box([0.05, 1.1, 1.6], [0.1, 0, 0], C.dark), box([1.4, 0.05, 1.6], [-0.6, -0.55, 0], C.dark)],
      explode: [0, 1.4, 0],
    },
    {
      id: "front-panel", en: "Front panel and temperature knob", ar: "اللوحة الأمامية ومقبض الحرارة",
      fnEn: "The knob sets the tip temperature; the indicator shows when the heater is on.",
      fnAr: "يضبط المقبض درجة حرارة الرأس، ويبين المؤشر الضوئي عمل السخان.",
      meshes: [box([1.4, 1.1, 0.06], [-0.6, 0, 0.83], C.black), cyl(0.25, 0.16, [-0.6, 0.05, 0.92], C.dark, "z"), cyl(0.04, 0.04, [-1.0, 0.4, 0.88], C.red, "z", { emissive: C.red })],
      explode: [0, 0, 1.3],
    },
    {
      id: "transformer", en: "Transformer", ar: "المحول",
      fnEn: "Reduces mains voltage to a safe low voltage for the heating element.",
      fnAr: "يخفض جهد الشبكة إلى جهد منخفض آمن لعنصر التسخين.",
      meshes: [box([0.6, 0.55, 0.55], [-0.7, -0.22, -0.3], C.metal, { metal: 0.7 }), cyl(0.22, 0.45, [-0.7, -0.22, -0.3], C.copper, "x", { metal: 0.6 })],
      explode: [-1.3, 0.3, -0.4],
    },
    {
      id: "control-board", en: "Temperature control board", ar: "لوحة التحكم في الحرارة",
      fnEn: "Reads the tip sensor and switches the heater to hold the set temperature.",
      fnAr: "تقرأ حساس الرأس وتشغّل السخان وتطفئه للحفاظ على درجة الحرارة المضبوطة.",
      meshes: [box([1.1, 0.03, 0.8], [-0.6, -0.48, 0.35], C.pcb), box([0.25, 0.06, 0.2], [-0.4, -0.44, 0.35], C.chip)],
      explode: [-0.4, -0.9, 0.9],
    },
    {
      id: "handpiece", en: "Iron / hot-air handpiece", ar: "قلم اللحام / مقبض الهواء الساخن",
      fnEn: "Contains the heating element and sensor; the tip or nozzle delivers heat to the joint.",
      fnAr: "يحتوي على عنصر التسخين والحساس، ويوصل الرأس أو الفوهة الحرارة إلى نقطة اللحام.",
      meshes: [cyl(0.1, 1.1, [1.0, 0.15, 0.1], C.dark, "x"), cone(0.06, 0.015, 0.45, [1.75, 0.15, 0.1], C.metal, "x")],
      explode: [1.1, 0.7, 0.3],
    },
    {
      id: "holder", en: "Iron holder and sponge", ar: "حامل القلم والإسفنجة",
      fnEn: "Safe resting place for the hot tool; the sponge cleans the tip.",
      fnAr: "مكان آمن لوضع الأداة الساخنة، وتُستخدم الإسفنجة لتنظيف الرأس.",
      meshes: [box([0.9, 0.12, 0.7], [1.0, -0.5, -0.3], C.black), box([0.4, 0.06, 0.3], [0.8, -0.41, -0.3], C.yellow), torus(0.14, 0.03, [1.25, -0.25, -0.3], C.metal, [0, Math.PI / 2, 0], { metal: 0.8 })],
      explode: [1.2, -0.7, -0.6],
    },
  ],
};

const solderingGun: Archetype = {
  key: "soldering-gun", en: "Soldering gun", ar: "مسدس لحام", size: 2.6,
  parts: [
    {
      id: "housing", en: "Pistol housing", ar: "هيكل المسدس",
      fnEn: "Insulated body that the user holds.",
      fnAr: "الجسم المعزول الذي يمسكه المستخدم.",
      meshes: [box([1.4, 0.6, 0.5], [0, 0.3, 0], C.white), box([0.45, 1.0, 0.45], [-0.35, -0.4, 0], C.white, { rot: [0, 0, -0.2] })],
      explode: [0, -1, -0.8],
    },
    {
      id: "trigger", en: "Trigger switch", ar: "زناد التشغيل",
      fnEn: "Turns the heating on only while pressed.",
      fnAr: "يشغّل التسخين فقط أثناء الضغط عليه.",
      meshes: [box([0.14, 0.35, 0.18], [0.0, -0.15, 0], C.red)],
      explode: [0.3, -0.9, 0.6],
    },
    {
      id: "transformer", en: "Internal transformer", ar: "المحول الداخلي",
      fnEn: "Delivers a very high current at low voltage through the tip, which heats it quickly.",
      fnAr: "يمرر تياراً عالياً جداً بجهد منخفض عبر الرأس فيسخن بسرعة.",
      meshes: [box([0.55, 0.45, 0.35], [0.05, 0.3, 0], C.metal, { metal: 0.7 }), cyl(0.17, 0.32, [0.05, 0.3, 0], C.copper, "x", { metal: 0.6 })],
      explode: [0, 1.1, 0],
    },
    {
      id: "tip", en: "Copper loop tip", ar: "رأس النحاس الحلقي",
      fnEn: "The current-carrying copper loop that becomes hot and melts the solder.",
      fnAr: "حلقة النحاس التي يمر بها التيار فتسخن وتذيب القصدير.",
      meshes: [cyl(0.03, 0.9, [1.1, 0.4, 0.08], C.copper, "x", { metal: 0.8 }), cyl(0.03, 0.9, [1.1, 0.2, -0.08], C.copper, "x", { metal: 0.8 })],
      explode: [1.0, 0.3, 0],
    },
    {
      id: "cable", en: "Power cable", ar: "سلك الكهرباء",
      fnEn: "Connects the tool to the mains supply.",
      fnAr: "يوصل الأداة بمصدر الكهرباء.",
      meshes: [cyl(0.05, 0.8, [-0.55, -1.1, 0], C.black)],
      explode: [-0.6, -0.8, 0],
    },
  ],
};

const microscope: Archetype = {
  key: "microscope", en: "Optical microscope", ar: "مجهر ضوئي", size: 3,
  parts: [
    {
      id: "base", en: "Base", ar: "القاعدة",
      fnEn: "Heavy base that keeps the microscope stable.",
      fnAr: "قاعدة ثقيلة تحافظ على ثبات المجهر.",
      meshes: [box([1.6, 0.2, 1.4], [0, -1.2, 0.1], C.white)],
      explode: [0, -1, 0],
    },
    {
      id: "light", en: "Illumination", ar: "الإضاءة",
      fnEn: "Lamp that lights the sample from below or above.",
      fnAr: "مصباح يضيء العينة من الأسفل أو الأعلى.",
      meshes: [cyl(0.18, 0.08, [0, -1.05, 0.3], C.glass, "y", { emissive: "#fff3c4" })],
      explode: [0.9, -0.6, 0.6], parent: "base",
    },
    {
      id: "arm", en: "Arm and pillar", ar: "الذراع والعمود",
      fnEn: "Supports the optical head and carries the focusing mechanism.",
      fnAr: "يحمل الرأس البصري وآلية الضبط البؤري.",
      meshes: [box([0.3, 1.8, 0.3], [0, -0.2, -0.45], C.white)],
      explode: [0, 0, -1],
    },
    {
      id: "focus", en: "Focus knobs", ar: "مقابض الضبط البؤري",
      fnEn: "Move the optics up and down to bring the sample into sharp focus.",
      fnAr: "تحرك العدسات للأعلى والأسفل لتوضيح صورة العينة.",
      meshes: [cyl(0.2, 0.12, [0.25, -0.1, -0.45], C.dark, "x"), cyl(0.2, 0.12, [-0.25, -0.1, -0.45], C.dark, "x")],
      explode: [1.1, 0, -0.6], parent: "arm",
    },
    {
      id: "stage", en: "Stage", ar: "المنصة",
      fnEn: "Flat table where the sample or circuit board is placed.",
      fnAr: "سطح مستوٍ توضع عليه العينة أو اللوحة الإلكترونية.",
      meshes: [box([1.1, 0.06, 0.9], [0, -0.75, 0.25], C.black)],
      explode: [0, -0.3, 1.1],
    },
    {
      id: "objective", en: "Objective lens", ar: "العدسة الشيئية",
      fnEn: "The lens closest to the sample; it creates the magnified image.",
      fnAr: "العدسة الأقرب إلى العينة، وهي التي تكوّن الصورة المكبرة.",
      meshes: [cyl(0.16, 0.45, [0, 0.0, 0.25], C.metal, "y", { metal: 0.8 })],
      explode: [0, -0.2, 1.6],
    },
    {
      id: "head", en: "Optical head", ar: "الرأس البصري",
      fnEn: "Houses prisms that send the image to the eyepieces.",
      fnAr: "يحتوي على المناشير التي توجه الصورة إلى العدسات العينية.",
      meshes: [box([0.8, 0.5, 0.7], [0, 0.45, 0.1], C.white)],
      explode: [0, 1, 0],
    },
    {
      id: "eyepieces", en: "Eyepieces", ar: "العدسات العينية",
      fnEn: "The lenses you look through; together with the objective they set the magnification.",
      fnAr: "العدسات التي ينظر من خلالها المستخدم، وتحدد مع العدسة الشيئية قوة التكبير.",
      meshes: [cyl(0.1, 0.55, [-0.18, 0.85, 0.2], C.black, "y", { rot: [-0.5, 0, 0] }), cyl(0.1, 0.55, [0.18, 0.85, 0.2], C.black, "y", { rot: [-0.5, 0, 0] })],
      explode: [0, 1.8, 0.2], parent: "head",
    },
  ],
};

const fan: Archetype = {
  key: "fan", en: "Axial cooling fan", ar: "مروحة تبريد محورية", size: 2.6,
  parts: [
    {
      id: "frame", en: "Fan frame", ar: "إطار المروحة",
      fnEn: "Housing that directs the airflow and has holes for mounting.",
      fnAr: "الإطار الذي يوجّه تدفق الهواء ويحتوي على ثقوب للتثبيت.",
      meshes: [box([2, 0.15, 0.4], [0, 0.93, 0], C.dark), box([2, 0.15, 0.4], [0, -0.93, 0], C.dark), box([0.15, 2, 0.4], [0.93, 0, 0], C.dark), box([0.15, 2, 0.4], [-0.93, 0, 0], C.dark)],
      explode: [0, 0, -1.2],
    },
    {
      id: "motor", en: "Motor hub", ar: "محور المحرك",
      fnEn: "Small electric motor in the centre that spins the blades.",
      fnAr: "محرك كهربائي صغير في المركز يدير الشفرات.",
      meshes: [cyl(0.3, 0.35, [0, 0, 0], C.black, "z")],
      explode: [0, 0, 0.3],
    },
    {
      id: "blades", en: "Impeller blades", ar: "الشفرات",
      fnEn: "Angled blades that push air through the fan.",
      fnAr: "شفرات مائلة تدفع الهواء عبر المروحة.",
      meshes: [0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return box([0.55, 0.32, 0.03], [Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0], C.dark, { rot: [0.5, 0, a] });
      }),
      explode: [0, 0, 1.0], parent: "motor",
    },
    {
      id: "guard", en: "Finger guard", ar: "الشبك الواقي",
      fnEn: "Metal grille that prevents fingers and objects from touching the blades.",
      fnAr: "شبك معدني يمنع الأصابع والأجسام من ملامسة الشفرات.",
      meshes: [torus(0.85, 0.02, [0, 0, 0.3], C.metal, [0, 0, 0], { metal: 0.8 }), torus(0.55, 0.02, [0, 0, 0.3], C.metal, [0, 0, 0], { metal: 0.8 }), torus(0.28, 0.02, [0, 0, 0.3], C.metal, [0, 0, 0], { metal: 0.8 })],
      explode: [0, 0, 1.8],
    },
  ],
};

const airPurifier: Archetype = {
  key: "air-purifier", en: "Air purifier", ar: "جهاز تنقية الهواء", size: 2.8,
  parts: [
    {
      id: "housing", en: "Housing", ar: "الهيكل",
      fnEn: "Outer body with air inlet and outlet.",
      fnAr: "الجسم الخارجي ويحتوي على مدخل ومخرج الهواء.",
      meshes: [box([1.2, 2, 0.05], [0, 0, -0.45], C.white), box([0.05, 2, 0.9], [-0.6, 0, 0], C.white), box([0.05, 2, 0.9], [0.6, 0, 0], C.white), box([1.2, 0.05, 0.9], [0, 1, 0], C.white)],
      explode: [0, 0, -1.2],
    },
    {
      id: "grille", en: "Front grille", ar: "الشبك الأمامي",
      fnEn: "Lets air in while protecting the filter.",
      fnAr: "يسمح بدخول الهواء ويحمي المرشح.",
      meshes: grid(1, 8, [0, 0.8, 0.46], [0, 0.2], "xy", (p) => box([1.1, 0.06, 0.03], p, C.case)),
      explode: [0, 0, 1.6],
    },
    {
      id: "filter", en: "Filter", ar: "المرشح (الفلتر)",
      fnEn: "Traps dust and fine particles from the air.",
      fnAr: "يحجز الغبار والجزيئات الدقيقة الموجودة في الهواء.",
      meshes: [box([1.05, 1.5, 0.2], [0, -0.1, 0.25], "#e9e4d6")],
      explode: [0, 0, 1.0],
    },
    {
      id: "fan", en: "Fan", ar: "المروحة",
      fnEn: "Draws room air through the filter.",
      fnAr: "تسحب هواء الغرفة عبر المرشح.",
      meshes: [cyl(0.4, 0.2, [0, 0.1, -0.15], C.dark, "z")],
      explode: [0, 0.4, 0.3],
    },
    {
      id: "controls", en: "Control panel", ar: "لوحة التحكم",
      fnEn: "Power and fan-speed buttons.",
      fnAr: "أزرار التشغيل وسرعة المروحة.",
      meshes: [box([1.0, 0.05, 0.4], [0, 1.04, 0.1], C.dark), cyl(0.05, 0.04, [0.3, 1.08, 0.1], C.glow, "y", { emissive: C.glow })],
      explode: [0, 0.9, 0],
    },
  ],
};

const motor: Archetype = {
  key: "motor", en: "Stepper motor", ar: "محرك خطوي", size: 2.4,
  parts: [
    {
      id: "housing", en: "Motor housing", ar: "غلاف المحرك",
      fnEn: "Outer body that holds the stator and dissipates heat.",
      fnAr: "الغلاف الخارجي الذي يحمل الجزء الثابت ويبدد الحرارة.",
      meshes: [cyl(0.7, 1.2, [0, 0, 0], C.metal, "z", { metal: 0.7 })],
      explode: [0, 1.2, 0],
    },
    {
      id: "stator", en: "Stator windings", ar: "ملفات الجزء الثابت",
      fnEn: "Copper coils that are energised in sequence to create a rotating magnetic field.",
      fnAr: "ملفات نحاسية تُغذّى بالتتابع لتوليد مجال مغناطيسي دوار.",
      meshes: [torus(0.48, 0.14, [0, 0, 0.2], C.copper, [0, 0, 0], { metal: 0.5 }), torus(0.48, 0.14, [0, 0, -0.2], C.copper, [0, 0, 0], { metal: 0.5 })],
      explode: [0, -1.1, 0],
    },
    {
      id: "rotor", en: "Rotor", ar: "الجزء الدوار",
      fnEn: "Magnetised rotor with teeth that moves one precise step at a time.",
      fnAr: "جزء دوار ممغنط بأسنان يتحرك خطوة دقيقة في كل مرة.",
      meshes: [cyl(0.3, 0.9, [0, 0, 0], C.dark, "z")],
      explode: [0, 0, 1.2],
    },
    {
      id: "shaft", en: "Output shaft", ar: "عمود الخرج",
      fnEn: "Transfers the motion to the driven mechanism.",
      fnAr: "ينقل الحركة إلى الآلية المراد تحريكها.",
      meshes: [cyl(0.07, 2, [0, 0, 0.3], C.metal, "z", { metal: 0.9 })],
      explode: [0, 0, 2.1], parent: "rotor",
    },
    {
      id: "end-caps", en: "End caps with bearings", ar: "الأغطية الطرفية والمحامل",
      fnEn: "Close the motor and hold bearings that let the shaft spin smoothly.",
      fnAr: "تغلق المحرك وتحمل المحامل التي تسمح للعمود بالدوران بسلاسة.",
      meshes: [cyl(0.72, 0.1, [0, 0, 0.65], C.dark, "z"), cyl(0.72, 0.1, [0, 0, -0.65], C.dark, "z")],
      explode: [0, 0, -1.4],
    },
  ],
};

const variac: Archetype = {
  key: "variac", en: "Variable autotransformer (Variac)", ar: "محول ذاتي متغير (Variac)", size: 2.6,
  parts: [
    {
      id: "case", en: "Case", ar: "الصندوق",
      fnEn: "Protective enclosure around the live parts.",
      fnAr: "صندوق واقٍ يحيط بالأجزاء المكهربة.",
      meshes: [box([1.6, 1.2, 1.6], [0, -0.3, 0], C.case, { metal: 0.3 })],
      explode: [0, -1.4, 0],
    },
    {
      id: "winding", en: "Toroidal winding", ar: "الملف الحلقي",
      fnEn: "A single copper coil on a ring-shaped iron core; the output is taken from any point on it.",
      fnAr: "ملف نحاسي واحد على قلب حديدي حلقي، ويؤخذ الخرج من أي نقطة عليه.",
      meshes: [torus(0.5, 0.2, [0, 0.45, 0], C.copper, [Math.PI / 2, 0, 0], { metal: 0.6 })],
      explode: [0, 0.9, 0],
    },
    {
      id: "brush", en: "Carbon brush arm", ar: "ذراع الفرشاة الكربونية",
      fnEn: "Slides over the winding to pick off the chosen voltage.",
      fnAr: "تنزلق على الملف لأخذ الجهد المطلوب.",
      meshes: [box([0.7, 0.05, 0.1], [0.3, 0.72, 0], C.metal, { metal: 0.8 }), box([0.12, 0.12, 0.12], [0.62, 0.68, 0], C.black)],
      explode: [0.8, 1.5, 0], parent: "winding",
    },
    {
      id: "knob", en: "Control knob and dial", ar: "المقبض والتدريج",
      fnEn: "Turns the brush arm; the dial shows the output voltage.",
      fnAr: "يدير ذراع الفرشاة، ويبين التدريج جهد الخرج.",
      meshes: [cyl(0.3, 0.2, [0, 0.95, 0], C.dark), cyl(0.6, 0.02, [0, 0.82, 0], C.white)],
      explode: [0, 2.2, 0],
    },
    {
      id: "terminals", en: "Input / output terminals", ar: "أطراف الدخل والخرج",
      fnEn: "Connect the mains input and the load.",
      fnAr: "لتوصيل مصدر الكهرباء والحمل.",
      meshes: [cyl(0.08, 0.18, [-0.4, -0.5, 0.85], C.red, "z"), cyl(0.08, 0.18, [-0.1, -0.5, 0.85], C.black, "z"), cyl(0.08, 0.18, [0.3, -0.5, 0.85], C.yellow, "z"), cyl(0.08, 0.18, [0.6, -0.5, 0.85], C.blue, "z")],
      explode: [0, -0.4, 1.4],
    },
  ],
};

const lightbox: Archetype = {
  key: "lightbox", en: "Film viewer / light box", ar: "جهاز عرض أفلام / صندوق إضاءة", size: 2.8,
  parts: [
    {
      id: "frame", en: "Frame", ar: "الإطار",
      fnEn: "Holds the diffuser and the lamps.",
      fnAr: "يحمل لوح التوزيع والمصابيح.",
      meshes: [box([2.4, 1.6, 0.05], [0, 0, -0.25], C.dark), box([2.4, 0.1, 0.5], [0, 0.8, 0], C.dark), box([2.4, 0.1, 0.5], [0, -0.8, 0], C.dark), box([0.1, 1.6, 0.5], [1.2, 0, 0], C.dark), box([0.1, 1.6, 0.5], [-1.2, 0, 0], C.dark)],
      explode: [0, 0, -1.2],
    },
    {
      id: "reflector", en: "Reflector", ar: "العاكس",
      fnEn: "White back surface that reflects light forward.",
      fnAr: "سطح خلفي أبيض يعكس الضوء إلى الأمام.",
      meshes: [box([2.25, 1.45, 0.02], [0, 0, -0.2], C.white)],
      explode: [0, 0, -0.6],
    },
    {
      id: "lamps", en: "Fluorescent / LED lamps", ar: "مصابيح الفلورسنت / LED",
      fnEn: "Provide the light source.",
      fnAr: "توفر مصدر الضوء.",
      meshes: grid(1, 4, [0, 0.5, 0], [0, 0.34], "xy", (p) => cyl(0.06, 2.1, p, C.white, "x", { emissive: "#fff6d8" })),
      explode: [0, 0, 0.5],
    },
    {
      id: "diffuser", en: "Diffuser panel", ar: "لوح توزيع الضوء",
      fnEn: "Frosted panel that spreads the light evenly so the film is uniformly lit.",
      fnAr: "لوح مصنفر ينشر الضوء بالتساوي لتُضاء الصورة بشكل متجانس.",
      meshes: [box([2.25, 1.45, 0.03], [0, 0, 0.22], "#eef6f7", { emissive: "#c9e7ea" })],
      explode: [0, 0, 1.3],
    },
    {
      id: "switch", en: "Power switch", ar: "مفتاح التشغيل",
      fnEn: "Turns the lamps on and off.",
      fnAr: "لتشغيل المصابيح وإطفائها.",
      meshes: [box([0.2, 0.08, 0.1], [0.9, -0.86, 0.15], C.red)],
      explode: [0.4, -0.6, 0.8],
    },
  ],
};

const multimeter: Archetype = {
  key: "multimeter", en: "Handheld multimeter", ar: "جهاز قياس متعدد محمول", size: 2.4,
  parts: [
    {
      id: "case", en: "Protective case", ar: "الغلاف الواقي",
      fnEn: "Insulated housing that protects the user and the electronics.",
      fnAr: "غلاف معزول يحمي المستخدم والإلكترونيات.",
      meshes: [box([1.1, 1.9, 0.08], [0, 0, -0.18], C.yellow), box([1.1, 0.08, 0.4], [0, 0.95, 0], C.yellow), box([1.1, 0.08, 0.4], [0, -0.95, 0], C.yellow), box([0.08, 1.9, 0.4], [0.55, 0, 0], C.yellow), box([0.08, 1.9, 0.4], [-0.55, 0, 0], C.yellow)],
      explode: [0, 0, -1],
    },
    {
      id: "display", en: "Display", ar: "الشاشة",
      fnEn: "Shows the reading (digital digits or a needle scale).",
      fnAr: "تعرض القراءة (أرقام رقمية أو مؤشر إبرة).",
      meshes: [box([0.85, 0.5, 0.04], [0, 0.55, 0.18], "#c8d6bf")],
      explode: [0, 0.5, 1.1],
    },
    {
      id: "selector", en: "Rotary function selector", ar: "مفتاح اختيار الوظيفة الدوار",
      fnEn: "Selects voltage, current or resistance and the measuring range.",
      fnAr: "لاختيار قياس الجهد أو التيار أو المقاومة ونطاق القياس.",
      meshes: [cyl(0.3, 0.1, [0, -0.15, 0.2], C.dark, "z"), box([0.08, 0.4, 0.04], [0, -0.15, 0.27], C.white)],
      explode: [0, 0, 1.6],
    },
    {
      id: "jacks", en: "Probe jacks", ar: "مقابس المجسّات",
      fnEn: "Sockets for the red and black test leads (COM, V/Ω, A).",
      fnAr: "مقابس لأسلاك القياس الحمراء والسوداء (COM و V/Ω و A).",
      meshes: [cyl(0.07, 0.1, [-0.3, -0.7, 0.2], C.black, "z"), cyl(0.07, 0.1, [0, -0.7, 0.2], C.red, "z"), cyl(0.07, 0.1, [0.3, -0.7, 0.2], C.red, "z")],
      explode: [0, -0.6, 1.2],
    },
    {
      id: "pcb", en: "Measurement circuit board", ar: "لوحة دائرة القياس",
      fnEn: "Converts the measured quantity into a reading, with protection fuses.",
      fnAr: "تحوّل الكمية المقاسة إلى قراءة، وتحتوي على مصاهر للحماية.",
      meshes: [box([0.95, 1.6, 0.03], [0, 0, 0], C.pcb), box([0.3, 0.3, 0.05], [0.1, 0.2, 0.04], C.chip)],
      explode: [1.1, 0, 0.3],
    },
    {
      id: "battery", en: "Battery", ar: "البطارية",
      fnEn: "Powers the meter.",
      fnAr: "تغذي الجهاز بالطاقة.",
      meshes: [box([0.5, 0.3, 0.15], [0, -0.55, -0.08], C.black)],
      explode: [-1.0, -0.4, -0.4],
    },
  ],
};

const kitCase: Archetype = {
  key: "kit-case", en: "Accessories / parts kit", ar: "حقيبة ملحقات وقطع", size: 2.6,
  parts: [
    {
      id: "tray", en: "Storage tray", ar: "صندوق التخزين",
      fnEn: "Transparent box that holds the parts.",
      fnAr: "صندوق شفاف يحفظ القطع.",
      meshes: [box([2.2, 0.05, 1.5], [0, -0.3, 0], C.glass), box([2.2, 0.6, 0.04], [0, 0, 0.75], C.glass), box([2.2, 0.6, 0.04], [0, 0, -0.75], C.glass), box([0.04, 0.6, 1.5], [1.1, 0, 0], C.glass), box([0.04, 0.6, 1.5], [-1.1, 0, 0], C.glass)],
      explode: [0, -0.8, 0],
    },
    {
      id: "dividers", en: "Compartment dividers", ar: "فواصل الأقسام",
      fnEn: "Keep each type of part separate and easy to find.",
      fnAr: "تفصل كل نوع من القطع ليسهل العثور عليه.",
      meshes: [box([0.03, 0.5, 1.45], [-0.37, -0.03, 0], C.case), box([0.03, 0.5, 1.45], [0.37, -0.03, 0], C.case), box([2.15, 0.5, 0.03], [0, -0.03, 0], C.case)],
      explode: [0, 0.6, 0],
    },
    {
      id: "parts", en: "Components and leads", ar: "المكونات وأسلاك التوصيل",
      fnEn: "Small components, ICs and connecting leads used in the experiments.",
      fnAr: "مكونات صغيرة ودوائر متكاملة وأسلاك توصيل تُستخدم في التجارب.",
      meshes: grid(3, 2, [-0.73, -0.2, -0.38], [0.73, 0.75], "xz", (p, i) => box([0.4, 0.12, 0.3], p, [C.red, C.chip, C.blue, C.yellow, C.black, C.pcb][i])),
      explode: [0, 1.3, 0],
    },
    {
      id: "lid", en: "Lid with label", ar: "الغطاء والملصق",
      fnEn: "Closes the box; the label identifies the kit.",
      fnAr: "يغلق الصندوق، ويحدد الملصق اسم الحقيبة.",
      meshes: [box([2.25, 0.05, 1.55], [0, 0.32, 0], C.glass), box([1.2, 0.01, 0.6], [0, 0.35, 0], C.white)],
      explode: [0, 2.1, 0],
    },
  ],
};

/**
 * K&H KL-93063 FM transmitter trainer — built from photos of the actual unit:
 * the front panel and circuit board surfaces ARE the photos; knobs, meter, connectors, heat sink and
 * loudspeaker are placed where they appear in those photos. (The board photo was taken from behind
 * and is mirrored so it lines up with the front panel.)
 */
const KW = 3.0, KD = 2.514;
const kp = (u: number, v: number, y: number): V3 => [(u - 0.5) * KW, y, (v - 0.5) * KD];
const kl93063: Archetype = {
  key: "kl-93063", en: "KL-93063 FM transmitter trainer", ar: "وحدة تدريب مرسل FM طراز KL-93063", size: 3.4, basis: "photos",
  parts: [
    {
      id: "front-panel", en: "Front panel (FM transmitter circuit diagram)", ar: "اللوحة الأمامية (مخطط دائرة مرسل FM)",
      fnEn: "Shows the complete transmitter circuit — crystal oscillator, buffer/doubler, RF amplifier, audio input and reference oscillator — with test points (TP1–TP9) for measurements.",
      fnAr: "تعرض دائرة المرسل كاملة — المذبذب البلوري، ومرحلة العزل/المضاعفة، ومكبر الترددات الراديوية، ومدخل الصوت، والمذبذب المرجعي — مع نقاط اختبار (TP1–TP9) لأخذ القياسات.",
      meshes: [box([KW, 0.04, KD], [0, 0.42, 0], C.panel), { shape: { kind: "plane", size: [KW, KD] }, pos: [0, 0.441, 0], color: C.white, textureUrl: "/devices/kl-93063/front-panel.jpg" }],
      explode: [0, 1.5, 0],
    },
    {
      id: "meter", en: "Frequency meter (tachometer)", ar: "مؤشر قياس التردد",
      fnEn: "Analogue meter of the frequency-tachometer section; it shows a reading that changes as the transmitter frequency changes.",
      fnAr: "مؤشر تناظري لقسم قياس التردد، تتغير قراءته بتغير تردد المرسل.",
      meshes: [box([0.5, 0.12, 0.42], kp(0.867, 0.309, 0.505), C.glass, { glass: true })],
      explode: [0.5, 2.4, -0.3], parent: "front-panel",
    },
    {
      id: "controls", en: "Adjustments: VR1 frequency, VR2 level, VR3 reference oscillator", ar: "مقابض الضبط: VR1 التردد، VR2 المستوى، VR3 المذبذب المرجعي",
      fnEn: "VR1 sets the transmitter frequency, VR2 the audio (modulation) level and VR3 the reference oscillator; the toggle selects MOD or OSC.",
      fnAr: "يضبط VR1 تردد المرسل، وVR2 مستوى الصوت (التضمين)، وVR3 المذبذب المرجعي؛ ويختار المفتاح بين MOD وOSC.",
      meshes: [
        ...[kp(0.102, 0.315, 0.48), kp(0.498, 0.633, 0.48), kp(0.854, 0.858, 0.48)].flatMap((p) => [box([0.13, 0.07, 0.13], p, C.blue), cyl(0.04, 0.1, [p[0], p[1] + 0.07, p[2]], C.black)]),
        cyl(0.035, 0.05, kp(0.49, 0.558, 0.47), C.metal, "y", { metal: 0.9 }),
        box([0.03, 0.03, 0.12], kp(0.49, 0.53, 0.5), C.red),
        ...[kp(0.498, 0.324, 0.47), kp(0.684, 0.324, 0.47)].map((p) => box([0.11, 0.06, 0.11], p, C.white)),
      ],
      explode: [-0.6, 2.2, 0.2], parent: "front-panel",
    },
    {
      id: "connectors", en: "Antenna (BNC), audio input and +12 V power socket", ar: "موصل الهوائي (BNC) ومدخل الصوت ومقبس التغذية +12 فولت",
      fnEn: "ANT connects an antenna or measuring instrument to the RF output, AUDIO INPUT feeds the signal to transmit, and the DIN socket supplies +12 V.",
      fnAr: "يوصل ANT هوائياً أو جهاز قياس بخرج الترددات الراديوية، ويُدخل AUDIO INPUT الإشارة المراد إرسالها، ويزوّد مقبس DIN الجهاز بجهد +12 فولت.",
      meshes: [
        cyl(0.06, 0.16, kp(0.86, 0.15, 0.52), C.metal, "y", { metal: 0.9, rough: 0.2 }),
        cyl(0.045, 0.06, kp(0.383, 0.574, 0.47), C.dark),
        cyl(0.1, 0.06, kp(0.072, 0.876, 0.47), C.metal, "y", { metal: 0.9 }),
      ],
      explode: [0.9, 2.0, 0.4], parent: "front-panel",
    },
    {
      id: "power-switch", en: "Power switch", ar: "مفتاح التشغيل",
      fnEn: "Turns the trainer on and off.",
      fnAr: "لتشغيل وحدة التدريب وإطفائها.",
      meshes: [box([0.43, 0.08, 0.24], kp(0.347, 0.871, 0.48), C.black)],
      explode: [-0.3, 1.9, 0.8], parent: "front-panel",
    },
    {
      id: "pcb", en: "Circuit board (transmitter electronics)", ar: "اللوحة الإلكترونية (إلكترونيات المرسل)",
      fnEn: "The actual circuit behind the panel: transistors, crystal, coils, capacitors and the two IC amplifiers, connected by copper tracks.",
      fnAr: "الدائرة الفعلية خلف اللوحة: ترانزستورات وكريستالة وملفات ومكثفات ودائرتا تكبير متكاملتان، تربطها مسارات نحاسية.",
      meshes: [box([2.9, 0.03, 2.2], [0, 0.06, 0], C.pcb), { shape: { kind: "plane", size: [2.85, 2.13] }, pos: [0, 0.077, 0], color: C.white, textureUrl: "/devices/kl-93063/circuit-board.jpg" }],
      explode: [0, 0.45, 0],
    },
    {
      id: "heatsink", en: "Heat sink", ar: "المشتت الحراري",
      fnEn: "Aluminium fins that carry heat away from the power components on the board.",
      fnAr: "زعانف ألمنيوم تبدد الحرارة الناتجة عن مكونات القدرة على اللوحة.",
      meshes: grid(8, 1, [-1.36, 0.19, -0.385], [0.11, 0], "xz", (p) => box([0.035, 0.22, 0.85], p, C.metal, { metal: 0.85, rough: 0.3 })),
      explode: [-0.7, 1.1, -0.5], parent: "pcb",
    },
    {
      id: "loudspeaker", en: "Loudspeaker", ar: "السماعة",
      fnEn: "Lets students hear the audio signal used in the experiments.",
      fnAr: "تتيح للطلاب سماع الإشارة الصوتية المستخدمة في التجارب.",
      meshes: [cyl(0.29, 0.1, [1.08, 0.13, 0.08], C.black), cone(0.25, 0.08, 0.05, [1.08, 0.2, 0.08], "#c9b27a"), cyl(0.05, 0.03, [1.08, 0.23, 0.08], C.dark)],
      explode: [0.7, 1.0, 0.4], parent: "pcb",
    },
    {
      id: "acrylic-case", en: "Clear acrylic case", ar: "الصندوق الأكريليك الشفاف",
      fnEn: "Protects the circuit while keeping it visible from the back of the unit.",
      fnAr: "يحمي الدائرة مع إبقائها ظاهرة من خلف الجهاز.",
      meshes: [
        box([KW, 0.03, KD - 0.2], [0, -0.3, 0], C.glass, { glass: true }),
        box([KW, 0.7, 0.03], [0, 0.05, (KD - 0.2) / 2], C.glass, { glass: true }), box([KW, 0.7, 0.03], [0, 0.05, -(KD - 0.2) / 2], C.glass, { glass: true }),
        box([0.03, 0.7, KD - 0.2], [KW / 2, 0.05, 0], C.glass, { glass: true }), box([0.03, 0.7, KD - 0.2], [-KW / 2, 0.05, 0], C.glass, { glass: true }),
      ],
      explode: [0, -1.0, 0],
    },
    {
      id: "standoffs", en: "Corner posts and feet", ar: "الأعمدة الطرفية والأقدام",
      fnEn: "Hold the board at the corners and keep the unit stable on the bench.",
      fnAr: "تثبت اللوحة من الأطراف وتحافظ على ثبات الجهاز على الطاولة.",
      meshes: [
        ...[[-1.3, -0.95], [1.3, -0.95], [-1.3, 0.95], [1.3, 0.95]].map(([x, z]) => cyl(0.07, 0.72, [x, 0.06, z], C.black)),
        ...[[-1.3, -0.95], [1.3, -0.95], [-1.3, 0.95], [1.3, 0.95]].map(([x, z]) => cyl(0.11, 0.06, [x, -0.35, z], C.black)),
      ],
      explode: [0, -1.6, 0],
    },
  ],
};

export const archetypes: Record<string, Archetype> = Object.fromEntries(
  [powerSupply, oscilloscope, benchInstrument, trainingBoard, kl93063, telephone, networkUnit, solderingStation, solderingGun, microscope, fan, airPurifier, motor, variac, lightbox, multimeter, kitCase].map((a) => [a.key, a]),
);

export function getArchetype(key: string): Archetype | undefined {
  return archetypes[key];
}
