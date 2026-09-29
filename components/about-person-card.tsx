import Image from "next/image";
import type { AboutPerson } from "@/data/about";

export function AboutPersonCard({ person, advisor = false }: { person: AboutPerson; advisor?: boolean }) {
  return (
    <article className={`about-person${advisor ? " about-person--advisor" : ""}`}>
      <div className="about-person-portrait">
        {person.image ? (
          <Image
            src={person.image.src}
            alt={person.image.alt}
            fill
            sizes={advisor ? "112px" : "160px"}
            style={{ objectPosition: person.image.objectPosition ?? "center" }}
          />
        ) : (
          <span aria-hidden="true">{person.initials}</span>
        )}
      </div>
      <div className="about-person-copy">
        <p className="about-person-role">{person.role}</p>
        <h3>{person.name}</h3>
        <p className="about-person-description">{person.description}</p>
      </div>
    </article>
  );
}
