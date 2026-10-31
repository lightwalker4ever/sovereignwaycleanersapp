import {
  Award,
  Clock,
  Shield,
  Heart,
  SlidersHorizontal,
  TrendingUp,
  Users,
  RefreshCw,
  Lightbulb,
  Leaf,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface BrandHighlight {
  icon: LucideIcon;
  label: string;
  text: string;
}

export const BRAND_HIGHLIGHTS: BrandHighlight[] = [
  {
    icon: Award,
    label: "Professional Standards",
    text: "Delivering the highest standards in every job, every time.",
  },
  {
    icon: Users,
    label: "Empowering People",
    text: "Training and growing the next generation of cleaning professionals.",
  },
  {
    icon: Heart,
    label: "Community Focused",
    text: "Actively engaging with and giving back to local communities.",
  },
  {
    icon: Leaf,
    label: "Sustainable Future",
    text: "Eco-friendly products for healthier homes and a cleaner planet.",
  },
];

export interface CoreValue {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const CORE_VALUES: CoreValue[] = [
  {
    icon: Award,
    title: "Excellence in Service",
    description:
      "We are committed to delivering the highest standards of cleaning across all environments — from homes to commercial spaces.",
  },
  {
    icon: Clock,
    title: "Reliability & Accountability",
    description:
      "We understand the value of trust. That's why we show up on time, communicate clearly, and deliver what we promise.",
  },
  {
    icon: Shield,
    title: "Integrity in Action",
    description:
      "We operate with honesty and transparency in everything we do — from clear, upfront pricing to straightforward communication. Our word is our bond.",
  },
  {
    icon: Heart,
    title: "Respect for People and Spaces",
    description:
      "We treat every property with care and every person with dignity — whether it's a client's home, an office, or a construction site.",
  },
  {
    icon: SlidersHorizontal,
    title: "Adaptability",
    description:
      "We tailor our services to match individual client requirements, scheduling preferences, and specific environments.",
  },
  {
    icon: TrendingUp,
    title: "Growth-Minded",
    description:
      "We invest in our people, improve our systems, and embrace innovation to grow sustainably.",
  },
  {
    icon: Users,
    title: "Community Commitment",
    description:
      "We strive to become a positive force through local engagement and partnerships within the communities we serve.",
  },
  {
    icon: RefreshCw,
    title: "Continuous Improvement",
    description:
      "We embrace learning, feedback, and innovation. Whether it's adopting safer products, smarter systems, or more efficient methods, we're always working to improve.",
  },
  {
    icon: Lightbulb,
    title: "Empowerment through Opportunity",
    description:
      "We believe in lifting others as we grow. Our long-term vision includes offering training and internship opportunities.",
  },
];
