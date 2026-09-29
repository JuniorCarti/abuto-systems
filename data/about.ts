export type AboutPerson = {
  name: string;
  initials: string;
  role: string;
  description: string;
  image?: { src: string; alt: string; objectPosition?: string };
};

export const capabilities = [
  {
    number: "01",
    title: "Business Management Systems",
    description:
      "Software for everyday work such as sales, inventory, customers, expenses, reporting and internal workflows.",
  },
  {
    number: "02",
    title: "Custom Software",
    description:
      "Web, mobile and desktop applications designed around a business or organization’s specific needs.",
  },
  {
    number: "03",
    title: "Digital Platforms",
    description:
      "Platforms that help people, organizations and information connect through clear digital workflows.",
  },
  {
    number: "04",
    title: "Software Support & Improvement",
    description:
      "We help improve, maintain and extend software as business needs change.",
  },
] as const;

export const coreTeam: AboutPerson[] = [
  {
    name: "Ridge Junior Abuto",
    initials: "RA",
    role: "Founder & Software Engineer",
    description:
      "Leads product development and technology strategy at Abuto Systems, focused on building practical software solutions for businesses and organizations.",
  },
  {
    name: "Aaron Onyango",
    initials: "AO",
    role: "Co-Founder & Backend Developer",
    description:
      "Focuses on backend development and the technical foundations that support Abuto Systems products and client solutions.",
  },
];

export const advisor: AboutPerson = {
  name: "Steven Abuto",
  initials: "SA",
  role: "Advisor",
  description:
    "Provides guidance and support to the Abuto Systems team as the company continues to develop its products and client solutions.",
};

export const priorityServiceAreas = ["Kisumu", "Eldoret", "Nairobi", "Mombasa", "Nakuru"] as const;

export const approachSteps = [
  {
    number: "01",
    title: "Understand",
    description:
      "We learn how the business works today and understand the problem that needs to be solved.",
  },
  {
    number: "02",
    title: "Build",
    description:
      "We design and develop a practical solution around the required workflow.",
  },
  {
    number: "03",
    title: "Test & Deploy",
    description:
      "We test the solution carefully and prepare it for real-world use.",
  },
  {
    number: "04",
    title: "Support & Improve",
    description:
      "We continue improving the system as needs change and new requirements emerge.",
  },
] as const;
