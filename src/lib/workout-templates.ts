export interface TemplateExercise {
  title: string;
  sets: number;
  reps: number | string;
  load_kg: number;
}

export interface TemplateDay {
  name: string;
  exercises: TemplateExercise[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  days: TemplateDay[];
}

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "full-body",
    name: "Full Body - 3 dias",
    description: "Corpo inteiro 3x por semana. Excelente para iniciantes.",
    days: [
      {
        name: "Full Body A",
        exercises: [
          { title: "Agachamento livre com barra", sets: 3, reps: 8, load_kg: 0 },
          { title: "Supino reto com barra", sets: 3, reps: 8, load_kg: 0 },
          { title: "Remada curvada com barra", sets: 3, reps: 8, load_kg: 0 },
          { title: "Desenvolvimento militar com halteres", sets: 3, reps: 10, load_kg: 0 },
          { title: "Levantamento terra romeno", sets: 3, reps: 10, load_kg: 0 },
          { title: "Rosca direta com barra", sets: 2, reps: 12, load_kg: 0 },
          { title: "Panturrilha em pé no aparelho", sets: 3, reps: 15, load_kg: 0 },
        ],
      },
      {
        name: "Full Body B",
        exercises: [
          { title: "Levantamento terra convencional", sets: 3, reps: 5, load_kg: 0 },
          { title: "Supino inclinado com halteres", sets: 3, reps: 10, load_kg: 0 },
          { title: "Barra fixa (pull-up)", sets: 3, reps: 8, load_kg: 0 },
          { title: "Leg press 45°", sets: 3, reps: 10, load_kg: 0 },
          { title: "Elevação lateral com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Tríceps corda na polia", sets: 2, reps: 12, load_kg: 0 },
          { title: "Panturrilha sentado no aparelho", sets: 3, reps: 15, load_kg: 0 },
        ],
      },
      {
        name: "Full Body C",
        exercises: [
          { title: "Agachamento frontal", sets: 3, reps: 8, load_kg: 0 },
          { title: "Supino reto com halteres", sets: 3, reps: 10, load_kg: 0 },
          { title: "Remada unilateral com halter", sets: 3, reps: 10, load_kg: 0 },
          { title: "Desenvolvimento Arnold", sets: 3, reps: 10, load_kg: 0 },
          { title: "Elevação pélvica (hip thrust)", sets: 3, reps: 10, load_kg: 0 },
          { title: "Rosca martelo com halteres", sets: 2, reps: 12, load_kg: 0 },
          { title: "Face pull na polia", sets: 3, reps: 15, load_kg: 0 },
        ],
      },
    ],
  },
  {
    id: "stronglifts-5x5",
    name: "5x5 StrongLifts - 3 dias",
    description: "Foco em força com 5 exercícios compostos. Progressão linear de carga.",
    days: [
      {
        name: "Treino A",
        exercises: [
          { title: "Agachamento livre com barra", sets: 5, reps: 5, load_kg: 0 },
          { title: "Supino reto com barra", sets: 5, reps: 5, load_kg: 0 },
          { title: "Remada curvada com barra", sets: 5, reps: 5, load_kg: 0 },
        ],
      },
      {
        name: "Treino B",
        exercises: [
          { title: "Agachamento livre com barra", sets: 5, reps: 5, load_kg: 0 },
          { title: "Desenvolvimento militar com barra", sets: 5, reps: 5, load_kg: 0 },
          { title: "Levantamento terra convencional", sets: 1, reps: 5, load_kg: 0 },
        ],
      },
    ],
  },
  {
    id: "ppl-3d",
    name: "Push Pull Legs (PPL) - 3 dias",
    description: "Divisão clássica: empuxe, puxada e pernas. 1x por semana.",
    days: [
      {
        name: "Push (Empuxe)",
        exercises: [
          { title: "Supino reto com barra", sets: 4, reps: 8, load_kg: 0 },
          { title: "Supino inclinado com halteres", sets: 3, reps: 10, load_kg: 0 },
          { title: "Desenvolvimento militar com barra", sets: 4, reps: 8, load_kg: 0 },
          { title: "Elevação lateral com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Tríceps testa (skullcrusher)", sets: 3, reps: 10, load_kg: 0 },
          { title: "Tríceps corda na polia", sets: 3, reps: 12, load_kg: 0 },
        ],
      },
      {
        name: "Pull (Puxada)",
        exercises: [
          { title: "Levantamento terra", sets: 4, reps: 5, load_kg: 0 },
          { title: "Barra fixa (pull-up)", sets: 4, reps: 8, load_kg: 0 },
          { title: "Remada curvada com barra", sets: 4, reps: 8, load_kg: 0 },
          { title: "Remada cavalinho (T-bar row)", sets: 3, reps: 10, load_kg: 0 },
          { title: "Face pull na polia", sets: 3, reps: 15, load_kg: 0 },
          { title: "Rosca direta com barra", sets: 3, reps: 10, load_kg: 0 },
          { title: "Rosca martelo com halteres", sets: 3, reps: 12, load_kg: 0 },
        ],
      },
      {
        name: "Legs (Pernas)",
        exercises: [
          { title: "Agachamento livre com barra", sets: 4, reps: 8, load_kg: 0 },
          { title: "Leg press 45°", sets: 4, reps: 10, load_kg: 0 },
          { title: "Cadeira extensora", sets: 3, reps: 12, load_kg: 0 },
          { title: "Mesa flexora", sets: 4, reps: 10, load_kg: 0 },
          { title: "Stiff com barra", sets: 3, reps: 10, load_kg: 0 },
          { title: "Panturrilha em pé no aparelho", sets: 4, reps: 15, load_kg: 0 },
          { title: "Elevação pélvica (hip thrust)", sets: 3, reps: 12, load_kg: 0 },
        ],
      },
    ],
  },
  {
    id: "upper-lower",
    name: "Upper/Lower - 4 dias",
    description: "Superior e inferior 2x por semana. Equilíbrio entre volume e recuperação.",
    days: [
      {
        name: "Superior A (Pesado)",
        exercises: [
          { title: "Supino reto com barra", sets: 4, reps: 6, load_kg: 0 },
          { title: "Remada curvada com barra", sets: 4, reps: 6, load_kg: 0 },
          { title: "Desenvolvimento militar com barra", sets: 3, reps: 8, load_kg: 0 },
          { title: "Puxada frontal na polia", sets: 3, reps: 8, load_kg: 0 },
          { title: "Elevação lateral com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Rosca direta com barra", sets: 3, reps: 10, load_kg: 0 },
          { title: "Tríceps testa (skullcrusher)", sets: 3, reps: 10, load_kg: 0 },
        ],
      },
      {
        name: "Inferior A (Pesado)",
        exercises: [
          { title: "Agachamento livre com barra", sets: 4, reps: 6, load_kg: 0 },
          { title: "Levantamento terra romeno", sets: 4, reps: 8, load_kg: 0 },
          { title: "Leg press 45°", sets: 3, reps: 10, load_kg: 0 },
          { title: "Mesa flexora", sets: 3, reps: 10, load_kg: 0 },
          { title: "Panturrilha em pé no aparelho", sets: 4, reps: 12, load_kg: 0 },
          { title: "Elevação pélvica (hip thrust)", sets: 3, reps: 10, load_kg: 0 },
        ],
      },
      {
        name: "Superior B (Volume)",
        exercises: [
          { title: "Supino inclinado com halteres", sets: 4, reps: 10, load_kg: 0 },
          { title: "Remada unilateral com halter", sets: 4, reps: 10, load_kg: 0 },
          { title: "Desenvolvimento Arnold", sets: 3, reps: 12, load_kg: 0 },
          { title: "Barra fixa (pull-up)", sets: 3, reps: 10, load_kg: 0 },
          { title: "Elevação lateral na polia", sets: 3, reps: 15, load_kg: 0 },
          { title: "Rosca martelo com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Tríceps corda na polia", sets: 3, reps: 12, load_kg: 0 },
        ],
      },
      {
        name: "Inferior B (Volume)",
        exercises: [
          { title: "Agachamento frontal", sets: 4, reps: 10, load_kg: 0 },
          { title: "Stiff com barra", sets: 4, reps: 10, load_kg: 0 },
          { title: "Búlgaro com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Cadeira extensora", sets: 3, reps: 15, load_kg: 0 },
          { title: "Cadeira flexora", sets: 3, reps: 12, load_kg: 0 },
          { title: "Panturrilha sentado no aparelho", sets: 4, reps: 15, load_kg: 0 },
        ],
      },
    ],
  },
  {
    id: "phul",
    name: "PHUL - 4 dias",
    description: "Power + Hypertrophy Upper/Lower. Combina força e hipertrofia.",
    days: [
      {
        name: "Upper Power (Força)",
        exercises: [
          { title: "Supino reto com barra", sets: 4, reps: 5, load_kg: 0 },
          { title: "Remada curvada com barra", sets: 4, reps: 5, load_kg: 0 },
          { title: "Desenvolvimento militar com barra", sets: 3, reps: 6, load_kg: 0 },
          { title: "Puxada frontal na polia", sets: 3, reps: 6, load_kg: 0 },
          { title: "Supino inclinado com halteres", sets: 3, reps: 8, load_kg: 0 },
          { title: "Rosca direta com barra", sets: 3, reps: 8, load_kg: 0 },
          { title: "Tríceps testa (skullcrusher)", sets: 3, reps: 8, load_kg: 0 },
        ],
      },
      {
        name: "Lower Power (Força)",
        exercises: [
          { title: "Agachamento livre com barra", sets: 4, reps: 5, load_kg: 0 },
          { title: "Levantamento terra convencional", sets: 4, reps: 5, load_kg: 0 },
          { title: "Leg press 45°", sets: 3, reps: 8, load_kg: 0 },
          { title: "Mesa flexora", sets: 3, reps: 8, load_kg: 0 },
          { title: "Panturrilha em pé no aparelho", sets: 4, reps: 10, load_kg: 0 },
          { title: "Elevação pélvica (hip thrust)", sets: 3, reps: 8, load_kg: 0 },
        ],
      },
      {
        name: "Upper Hyper (Hipertrofia)",
        exercises: [
          { title: "Supino inclinado com halteres", sets: 4, reps: 10, load_kg: 0 },
          { title: "Remada unilateral com halter", sets: 4, reps: 10, load_kg: 0 },
          { title: "Desenvolvimento com halteres sentado", sets: 3, reps: 12, load_kg: 0 },
          { title: "Barra fixa (pull-up)", sets: 3, reps: 10, load_kg: 0 },
          { title: "Elevação lateral com halteres", sets: 3, reps: 15, load_kg: 0 },
          { title: "Crossover na polia", sets: 3, reps: 15, load_kg: 0 },
          { title: "Rosca martelo com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Tríceps corda na polia", sets: 3, reps: 12, load_kg: 0 },
        ],
      },
      {
        name: "Lower Hyper (Hipertrofia)",
        exercises: [
          { title: "Agachamento frontal", sets: 4, reps: 10, load_kg: 0 },
          { title: "Levantamento terra romeno", sets: 4, reps: 10, load_kg: 0 },
          { title: "Búlgaro com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Cadeira extensora", sets: 3, reps: 15, load_kg: 0 },
          { title: "Cadeira flexora", sets: 3, reps: 12, load_kg: 0 },
          { title: "Panturrilha sentado no aparelho", sets: 4, reps: 15, load_kg: 0 },
          { title: "Passada com halteres", sets: 3, reps: 12, load_kg: 0 },
        ],
      },
    ],
  },
  {
    id: "bro-split",
    name: "Bro Split - 5 dias",
    description: "Bodybuilding tradicional. 1 grupo muscular por dia.",
    days: [
      {
        name: "Peito",
        exercises: [
          { title: "Supino reto com barra", sets: 4, reps: 8, load_kg: 0 },
          { title: "Supino inclinado com halteres", sets: 4, reps: 10, load_kg: 0 },
          { title: "Supino declinado com barra", sets: 3, reps: 10, load_kg: 0 },
          { title: "Crucifixo com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Crossover na polia", sets: 3, reps: 15, load_kg: 0 },
        ],
      },
      {
        name: "Costas",
        exercises: [
          { title: "Barra fixa (pull-up)", sets: 4, reps: 8, load_kg: 0 },
          { title: "Remada curvada com barra", sets: 4, reps: 8, load_kg: 0 },
          { title: "Puxada frontal na polia", sets: 4, reps: 10, load_kg: 0 },
          { title: "Remada cavalinho (T-bar row)", sets: 3, reps: 10, load_kg: 0 },
          { title: "Remada unilateral com halter", sets: 3, reps: 12, load_kg: 0 },
        ],
      },
      {
        name: "Ombros",
        exercises: [
          { title: "Desenvolvimento militar com barra", sets: 4, reps: 8, load_kg: 0 },
          { title: "Desenvolvimento com halteres sentado", sets: 4, reps: 10, load_kg: 0 },
          { title: "Elevação lateral com halteres", sets: 4, reps: 12, load_kg: 0 },
          { title: "Elevação frontal com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Elevação posterior (reverse fly)", sets: 4, reps: 15, load_kg: 0 },
          { title: "Encolhimento com halteres", sets: 4, reps: 12, load_kg: 0 },
        ],
      },
      {
        name: "Braços",
        exercises: [
          { title: "Rosca direta com barra", sets: 4, reps: 10, load_kg: 0 },
          { title: "Rosca alternada com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Rosca martelo com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Rosca concentrada", sets: 3, reps: 12, load_kg: 0 },
          { title: "Tríceps testa (skullcrusher)", sets: 4, reps: 10, load_kg: 0 },
          { title: "Tríceps pulley na polia alta", sets: 3, reps: 12, load_kg: 0 },
          { title: "Tríceps mergulho em paralelas", sets: 3, reps: 10, load_kg: 0 },
        ],
      },
      {
        name: "Pernas",
        exercises: [
          { title: "Agachamento livre com barra", sets: 4, reps: 8, load_kg: 0 },
          { title: "Leg press 45°", sets: 4, reps: 10, load_kg: 0 },
          { title: "Cadeira extensora", sets: 3, reps: 12, load_kg: 0 },
          { title: "Mesa flexora", sets: 4, reps: 10, load_kg: 0 },
          { title: "Stiff com barra", sets: 3, reps: 10, load_kg: 0 },
          { title: "Elevação pélvica (hip thrust)", sets: 3, reps: 12, load_kg: 0 },
          { title: "Panturrilha em pé no aparelho", sets: 4, reps: 15, load_kg: 0 },
        ],
      },
    ],
  },
  {
    id: "ppl-6d",
    name: "PPL - 6 dias",
    description: "PPL 2x por semana. Alto volume para hipertrofia avançada.",
    days: [
      {
        name: "Push A (Pesado)",
        exercises: [
          { title: "Supino reto com barra", sets: 5, reps: 5, load_kg: 0 },
          { title: "Supino inclinado com halteres", sets: 4, reps: 8, load_kg: 0 },
          { title: "Desenvolvimento militar com halteres", sets: 4, reps: 8, load_kg: 0 },
          { title: "Elevação lateral com halteres", sets: 4, reps: 12, load_kg: 0 },
          { title: "Tríceps mergulho em paralelas", sets: 3, reps: 10, load_kg: 0 },
          { title: "Tríceps francês com halter", sets: 3, reps: 12, load_kg: 0 },
        ],
      },
      {
        name: "Pull A (Pesado)",
        exercises: [
          { title: "Levantamento terra convencional", sets: 5, reps: 5, load_kg: 0 },
          { title: "Barra fixa com peso", sets: 4, reps: 6, load_kg: 0 },
          { title: "Remada curvada com barra", sets: 4, reps: 8, load_kg: 0 },
          { title: "Puxada frontal na polia", sets: 3, reps: 10, load_kg: 0 },
          { title: "Face pull na polia", sets: 3, reps: 15, load_kg: 0 },
          { title: "Rosca direta com barra EZ", sets: 4, reps: 8, load_kg: 0 },
          { title: "Rosca martelo com halteres", sets: 3, reps: 12, load_kg: 0 },
        ],
      },
      {
        name: "Legs A (Pesado)",
        exercises: [
          { title: "Agachamento livre com barra", sets: 5, reps: 5, load_kg: 0 },
          { title: "Leg press 45°", sets: 4, reps: 8, load_kg: 0 },
          { title: "Passada com halteres", sets: 3, reps: 10, load_kg: 0 },
          { title: "Mesa flexora", sets: 4, reps: 10, load_kg: 0 },
          { title: "Stiff com barra", sets: 3, reps: 10, load_kg: 0 },
          { title: "Panturrilha sentado no aparelho", sets: 4, reps: 15, load_kg: 0 },
          { title: "Elevação pélvica (hip thrust)", sets: 4, reps: 10, load_kg: 0 },
        ],
      },
      {
        name: "Push B (Volume)",
        exercises: [
          { title: "Supino inclinado com barra", sets: 4, reps: 10, load_kg: 0 },
          { title: "Supino reto com halteres", sets: 4, reps: 10, load_kg: 0 },
          { title: "Desenvolvimento Arnold", sets: 3, reps: 12, load_kg: 0 },
          { title: "Elevação lateral na polia", sets: 4, reps: 15, load_kg: 0 },
          { title: "Tríceps pulley na polia alta", sets: 4, reps: 12, load_kg: 0 },
          { title: "Tríceps coice com halter", sets: 3, reps: 12, load_kg: 0 },
        ],
      },
      {
        name: "Pull B (Volume)",
        exercises: [
          { title: "Levantamento terra romeno", sets: 4, reps: 10, load_kg: 0 },
          { title: "Puxada frontal na polia", sets: 4, reps: 10, load_kg: 0 },
          { title: "Remada unilateral com halter", sets: 4, reps: 10, load_kg: 0 },
          { title: "Remada cavalinho (T-bar row)", sets: 3, reps: 12, load_kg: 0 },
          { title: "Face pull na polia", sets: 3, reps: 15, load_kg: 0 },
          { title: "Rosca alternada com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Rosca concentrada", sets: 3, reps: 12, load_kg: 0 },
        ],
      },
      {
        name: "Legs B (Volume)",
        exercises: [
          { title: "Agachamento frontal", sets: 4, reps: 10, load_kg: 0 },
          { title: "Leg press 45° unilateral", sets: 3, reps: 12, load_kg: 0 },
          { title: "Cadeira extensora", sets: 4, reps: 15, load_kg: 0 },
          { title: "Cadeira flexora", sets: 4, reps: 12, load_kg: 0 },
          { title: "Búlgaro com halteres", sets: 3, reps: 10, load_kg: 0 },
          { title: "Panturrilha em pé no aparelho", sets: 4, reps: 15, load_kg: 0 },
          { title: "Abdutora na máquina", sets: 3, reps: 15, load_kg: 0 },
        ],
      },
    ],
  },
  {
    id: "arnold-split",
    name: "Arnold Split - 6 dias",
    description: "Divisão clássica de Arnold. Peito+Costas, Ombros+Braços e Pernas.",
    days: [
      {
        name: "Peito e Costas A",
        exercises: [
          { title: "Supino reto com barra", sets: 4, reps: 8, load_kg: 0 },
          { title: "Supino inclinado com halteres", sets: 4, reps: 10, load_kg: 0 },
          { title: "Crucifixo com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Barra fixa (pull-up)", sets: 4, reps: 8, load_kg: 0 },
          { title: "Remada curvada com barra", sets: 4, reps: 8, load_kg: 0 },
          { title: "Pullover com halter", sets: 3, reps: 12, load_kg: 0 },
        ],
      },
      {
        name: "Ombros e Braços A",
        exercises: [
          { title: "Desenvolvimento militar com barra", sets: 4, reps: 8, load_kg: 0 },
          { title: "Elevação lateral com halteres", sets: 4, reps: 12, load_kg: 0 },
          { title: "Elevação posterior (reverse fly)", sets: 3, reps: 15, load_kg: 0 },
          { title: "Rosca direta com barra", sets: 4, reps: 10, load_kg: 0 },
          { title: "Rosca martelo com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Tríceps testa (skullcrusher)", sets: 4, reps: 10, load_kg: 0 },
          { title: "Tríceps pulley na polia alta", sets: 3, reps: 12, load_kg: 0 },
        ],
      },
      {
        name: "Pernas A",
        exercises: [
          { title: "Agachamento livre com barra", sets: 4, reps: 8, load_kg: 0 },
          { title: "Leg press 45°", sets: 4, reps: 10, load_kg: 0 },
          { title: "Cadeira extensora", sets: 3, reps: 12, load_kg: 0 },
          { title: "Mesa flexora", sets: 4, reps: 10, load_kg: 0 },
          { title: "Stiff com barra", sets: 3, reps: 10, load_kg: 0 },
          { title: "Elevação pélvica (hip thrust)", sets: 3, reps: 12, load_kg: 0 },
          { title: "Panturrilha em pé no aparelho", sets: 4, reps: 15, load_kg: 0 },
        ],
      },
      {
        name: "Peito e Costas B",
        exercises: [
          { title: "Supino inclinado com barra", sets: 4, reps: 8, load_kg: 0 },
          { title: "Supino reto com halteres", sets: 4, reps: 10, load_kg: 0 },
          { title: "Crossover na polia", sets: 3, reps: 15, load_kg: 0 },
          { title: "Puxada frontal na polia", sets: 4, reps: 10, load_kg: 0 },
          { title: "Remada cavalinho (T-bar row)", sets: 4, reps: 10, load_kg: 0 },
          { title: "Remada unilateral com halter", sets: 3, reps: 12, load_kg: 0 },
        ],
      },
      {
        name: "Ombros e Braços B",
        exercises: [
          { title: "Desenvolvimento com halteres sentado", sets: 4, reps: 10, load_kg: 0 },
          { title: "Elevação lateral na polia", sets: 4, reps: 15, load_kg: 0 },
          { title: "Encolhimento com halteres", sets: 4, reps: 12, load_kg: 0 },
          { title: "Rosca alternada com halteres", sets: 4, reps: 12, load_kg: 0 },
          { title: "Rosca concentrada", sets: 3, reps: 12, load_kg: 0 },
          { title: "Tríceps corda na polia", sets: 4, reps: 12, load_kg: 0 },
          { title: "Tríceps mergulho em paralelas", sets: 3, reps: 10, load_kg: 0 },
        ],
      },
      {
        name: "Pernas B",
        exercises: [
          { title: "Agachamento frontal", sets: 4, reps: 10, load_kg: 0 },
          { title: "Búlgaro com halteres", sets: 3, reps: 12, load_kg: 0 },
          { title: "Cadeira extensora", sets: 4, reps: 15, load_kg: 0 },
          { title: "Cadeira flexora", sets: 4, reps: 12, load_kg: 0 },
          { title: "Levantamento terra romeno", sets: 3, reps: 10, load_kg: 0 },
          { title: "Passada com halteres", sets: 3, reps: 10, load_kg: 0 },
          { title: "Panturrilha em pé no aparelho", sets: 4, reps: 15, load_kg: 0 },
        ],
      },
    ],
  },
];
