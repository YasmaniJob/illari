import type { ReactNode } from 'react';

export type CardDirection = 'forward' | 'back';

export interface StackCard {
  id: number;
  content: ReactNode;
}

interface CardStackProps {
  cards: StackCard[];
  activeStep: number;
  direction: CardDirection;
}

export default function CardStack({ cards, activeStep }: CardStackProps) {
  const activeCard = cards.find((card) => card.id === activeStep);

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
      {activeCard ? (
        <div key={activeCard.id} className="flex min-h-0 flex-1 flex-col">
          {activeCard.content}
        </div>
      ) : null}
    </div>
  );
}
