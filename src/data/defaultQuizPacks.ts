import { Question, QuizPack } from '../types/quiz';
import { CHASE_QUIZ_PACKS } from './chaseArchive';

export type { QuizPack };

export const DEFAULT_QUIZ_PACKS: QuizPack[] = [
  {
    id: 'pack-gk-1',
    title: 'General Knowledge: Round 1',
    description: '13 general knowledge questions with a 5-point bonus connection at the end.',
    questions: [
      {
        id: 'sing_1',
        type: 'TEXT',
        category: 'General Knowledge',
        question: 'What popular Tex-Mex snack consists of heated tortilla chips covered in melted cheese and jalapeños?',
        answer: 'Nachos',
        points: 10
      },
      {
        id: 'sing_2',
        type: 'TEXT',
        category: 'General Knowledge',
        question: 'In the acronym NHS, what does the letter N stand for?',
        answer: 'National',
        points: 10
      },
      {
        id: 'sing_3',
        type: 'TEXT',
        category: 'General Knowledge',
        question: 'What is the Italian city widely considered to be the historical birthplace of pizza?',
        answer: 'Naples',
        points: 10
      },
      {
        id: 'sing_4',
        type: 'TEXT',
        category: 'General Knowledge',
        question: 'What is the first name of the iconic British supermodel whose surname is Campbell?',
        answer: 'Naomi',
        points: 10
      },
      {
        id: 'sing_5',
        type: 'TEXT',
        category: 'General Knowledge',
        question: 'Who was the French military leader famously defeated at the Battle of Waterloo in 1815?',
        answer: 'Napoleon',
        points: 10
      },
      {
        id: 'sing_6',
        type: 'TEXT',
        category: 'General Knowledge',
        question: 'In the Marvel Cinematic Universe, what is the real first name of the superhero Black Widow?',
        answer: 'Natasha',
        points: 10
      },
      {
        id: 'sing_7',
        type: 'TEXT',
        category: 'General Knowledge',
        question: 'What is the name of the magical fantasy world accessed through a wardrobe in the classic C.S. Lewis books?',
        answer: 'Narnia',
        points: 10
      },
      {
        id: 'sing_8',
        type: 'TEXT',
        category: 'General Knowledge',
        question: 'In music, what word is used to describe a note that is neither sharp nor flat?',
        answer: 'Natural',
        points: 10
      },
      {
        id: 'sing_9',
        type: 'TEXT',
        category: 'General Knowledge',
        question: "What four-letter word can refer to a country's fleet of military ships, or a very dark shade of blue?",
        answer: 'Navy',
        points: 10
      },
      {
        id: 'sing_10',
        type: 'TEXT',
        category: 'General Knowledge',
        question: 'What is the surname of the female tennis legend who won a record nine Wimbledon singles titles?',
        answer: 'Navratilova',
        points: 10
      },
      {
        id: 'sing_11',
        type: 'TEXT',
        category: 'General Knowledge',
        question: 'Which independent US government agency is responsible for the civilian space programme?',
        answer: 'NASA',
        points: 10
      },
      {
        id: 'sing_12',
        type: 'TEXT',
        category: 'General Knowledge',
        question: "What six-letter word refers to the period of a person's or thing's greatest success, popularity, or prime?",
        answer: 'Heyday',
        points: 10
      },
      {
        id: 'sing_13',
        type: 'TEXT',
        category: 'General Knowledge',
        question: "What is the first name of the British actor who plays Iris's brother Graham in the Christmas film The Holiday?",
        answer: 'Jude / Jude Law',
        points: 10
      },
      {
        id: 'sing_14',
        type: 'TEXT',
        category: 'Bonus Connection',
        question: 'BONUS (5 Pts): Look closely at the start of your 13 answers in order. What hidden musical connection links them?',
        answer: 'Hey Jude / The Beatles',
        points: 5,
        explanation: 'Read the first syllable of all 13 answers in order: "Na, na na na na na na, na na na na, Hey Jude!" (Nachos, National, Naples, Naomi, Napoleon, Natasha, Narnia, Natural, Navy, Navratilova, NASA, Heyday, Jude).'
      }
    ]
  },
  {
    id: 'pack-who-said-it',
    title: 'Who Said It: Gemma, Piggy, or Trump?',
    description: 'Was the quote spoken by Gemma Collins, Miss Piggy, or Donald Trump?',
    questions: [
      {
        id: 'q_quote_1',
        type: 'MCQ',
        category: 'Who Said It?',
        question: '"Part of the beauty of me is that I am very rich."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Donald Trump',
        points: 10,
        explanation: 'Said during a 2011 Good Morning America interview... though it sounds just like Miss Piggy!'
      },
      {
        id: 'q_quote_2',
        type: 'MCQ',
        category: 'Who Said It?',
        question: '"I’ve got a very, very, very high IQ. I’m basically a genius."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Gemma Collins',
        points: 10,
        explanation: 'Said during her stint on Celebrity Big Brother.'
      },
      {
        id: 'q_quote_3',
        type: 'MCQ',
        category: 'Who Said It?',
        question: '"I don\'t care what you think of me, unless you think I\'m absolutely wonderful."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Miss Piggy',
        points: 10
      },
      {
        id: 'q_quote_4',
        type: 'MCQ',
        category: 'Who Said It?',
        question: '"I think I am actually humble. I think I\'m much more humble than you would understand."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Donald Trump',
        points: 10,
        explanation: 'A genuine quote from a 2016 interview on 60 Minutes.'
      },
      {
        id: 'q_quote_5',
        type: 'MCQ',
        category: 'Who Said It?',
        question: '"I am a massive fan of the dictionary."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Gemma Collins',
        points: 10,
        explanation: 'Another classic GC quote from reality TV.'
      },
      {
        id: 'q_quote_6',
        type: 'MCQ',
        category: 'Who Said It?',
        question: '"Expressing your feelings is good. Especially if they\'re feelings of absolute adoration for me."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Miss Piggy',
        points: 10
      },
      {
        id: 'q_quote_7',
        type: 'MCQ',
        category: 'Who Said It?',
        question: '"I have never seen a thin person drinking Diet Coke."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Donald Trump',
        points: 10,
        explanation: 'A 2012 tweet... though it sounds 100% like Gemma Collins giving diet advice!'
      },
      {
        id: 'q_quote_8',
        type: 'MCQ',
        category: 'Who Said It?',
        question: '"I\'ve earned my divaship."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Gemma Collins',
        points: 10,
        explanation: 'Her justification for her demands on reality TV.'
      },
      {
        id: 'q_quote_9',
        type: 'MCQ',
        category: 'Who Said It?',
        question: '"Sorry losers and haters, but my I.Q. is one of the highest, and you all know it! Please don\'t feel so stupid or insecure, it\'s not your fault."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Donald Trump',
        points: 10,
        explanation: 'Another genuine tweet.'
      },
      {
        id: 'q_quote_10',
        type: 'MCQ',
        category: 'Who Said It?',
        question: '"Beauty is in the eye of the beholder, and it may be necessary from time to time to give a stupid or misinformed beholder a black eye."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Miss Piggy',
        points: 10
      }
    ]
  },
  {
    id: 'pack-1-star-reviews',
    title: 'Genuine 1-Star Film Reviews',
    description: 'Guess the film from a genuine 1-star Amazon review.',
    questions: [
      {
        id: 'rev_1',
        type: 'TEXT',
        category: '1-Star Reviews',
        question: '"I wanted to like this film. But there\'s not a scary frame in the film... the characters to me were nothing more than fish food... Also, the music was boring. And what was with all the water? 1 star."',
        answer: 'Jaws',
        points: 10
      },
      {
        id: 'rev_2',
        type: 'TEXT',
        category: '1-Star Reviews',
        question: '"This was very confusing. Where were the other 2000? 1 star."',
        answer: '2001: A Space Odyssey / 2001',
        points: 10
      },
      {
        id: 'rev_3',
        type: 'TEXT',
        category: '1-Star Reviews',
        question: '"What\'s so great about it? It\'s like Stir Crazy, but without Gene Wilder. I didn\'t need to sit through 90 minutes just to see a guy going through a crap tube barfing up his guts. 1 star."',
        answer: 'The Shawshank Redemption / Shawshank Redemption',
        points: 10
      },
      {
        id: 'rev_4',
        type: 'TEXT',
        category: '1-Star Reviews',
        question: '"It ultimately boils down to some sisters trying to marry (up, for the most part) in the world... nothing really ever happens. It just goes on and on and on... There should have been explosions. And a dog. 1 star."',
        answer: 'Pride & Prejudice / Pride and Prejudice',
        points: 10
      },
      {
        id: 'rev_5',
        type: 'TEXT',
        category: '1-Star Reviews',
        question: '"Neil Armstrong definitely saw aliens, so I don\'t know why they left them out in the movie. 1 star."',
        answer: 'First Man',
        points: 10
      },
      {
        id: 'rev_6',
        type: 'TEXT',
        category: '1-Star Reviews',
        question: '"The effect that came across was just a feeling of repulsion with the worst violence, as in the torture scenes... because he should only have said, \'Prepare to die,\' once instead of nattering on about it. 1 star."',
        answer: 'The Princess Bride',
        points: 10
      },
      {
        id: 'rev_7',
        type: 'TEXT',
        category: '1-Star Reviews',
        question: '"Cold is a way better title. 1 star."',
        answer: 'Frozen',
        points: 10
      },
      {
        id: 'rev_8',
        type: 'TEXT',
        category: '1-Star Reviews',
        question: '"The Eagles could have just flown the Fellowship to Mordor and saved 800 pages or so. Religious propaganda. 1 star."',
        answer: 'The Lord of the Rings / The Fellowship of the Ring',
        points: 10,
        explanation: 'Also accept The Fellowship of the Ring.'
      },
      {
        id: 'rev_9',
        type: 'TEXT',
        category: '1-Star Reviews',
        question: '"This movie was morally irreprehensible and ruined my evening. 1 star."',
        answer: 'There Will Be Blood',
        points: 10
      },
      {
        id: 'rev_10',
        type: 'TEXT',
        category: '1-Star Reviews',
        question: '"The amount of plagiarism contained in this movie is staggering, probably a world record. It is the exact replica of the first movie \'A New Hope\'. Even the title have the same meaning. 1 star."',
        answer: 'Star Wars: The Force Awakens / The Force Awakens',
        points: 10
      }
    ]
  },
  {
    id: 'pack-gk-2',
    title: 'General Knowledge: Round 2',
    description: '9 general knowledge questions followed by a connection question.',
    questions: [
      {
        id: 'boh_1',
        type: 'TEXT',
        category: 'General Knowledge',
        question: "In traditional 16th-century Italian commedia dell'arte theatre, what was the name of the boastful but cowardly clown character who traditionally dressed all in black?",
        answer: 'Scaramouche',
        points: 10
      },
      {
        id: 'boh_2',
        type: 'TEXT',
        category: 'General Knowledge',
        question: 'What is the name of a lively Spanish and Portuguese dance in triple time, typically danced by a couple and accompanied by guitars and castanets?',
        answer: 'Fandango',
        points: 10
      },
      {
        id: 'boh_3',
        type: 'TEXT',
        category: 'General Knowledge',
        question: 'Developed by Intel in collaboration with Apple, what is the brand name of the high-speed hardware interface used to connect external peripherals to a computer, represented by a logo of a downward-pointing lightning flash?',
        answer: 'Thunderbolt',
        points: 10
      },
      {
        id: 'boh_4',
        type: 'TEXT',
        category: 'General Knowledge',
        question: 'Which Italian astronomer discovered the four largest moons of Jupiter in 1610, which are now named in his honour?',
        answer: 'Galileo / Galileo Galilei',
        points: 10
      },
      {
        id: 'boh_5',
        type: 'TEXT',
        category: 'General Knowledge',
        question: "What is the name of Geppetto's pet tuxedo cat in the 1940 Disney animated film Pinocchio, a name he shares with the famous 'Barber of Seville'?",
        answer: 'Figaro',
        points: 10
      },
      {
        id: 'boh_6',
        type: 'TEXT',
        category: 'General Knowledge',
        question: 'What is the name of the villainous, wish-granting King in the 2023 Disney animated musical film Wish?',
        answer: 'Magnifico / King Magnifico',
        points: 10
      },
      {
        id: 'boh_7',
        type: 'TEXT',
        category: 'General Knowledge',
        question: "Translating to 'In the name of God' or 'In the name of Allah', what Arabic phrase is recited as the opening word of almost every chapter of the Quran?",
        answer: 'Bismillah',
        points: 10
      },
      {
        id: 'boh_8',
        type: 'TEXT',
        category: 'General Knowledge',
        question: "Derived from a Philistine god worshipped in Ekron, what nine-letter name is often used in literature and religion as a synonym for Satan or the 'prince of demons'?",
        answer: 'Beelzebub',
        points: 10
      },
      {
        id: 'boh_9',
        type: 'TEXT',
        category: 'General Knowledge',
        question: "What phrase, meaning 'my mother' in Italian, was the title of a 1975 UK number one hit that ironically knocked Queen off the top spot?",
        answer: 'Mamma Mia',
        points: 10
      },
      {
        id: 'boh_10',
        type: 'TEXT',
        category: 'The Connection',
        question: 'Look closely at your previous nine answers. What is the specific connection between them all?',
        answer: 'Bohemian Rhapsody',
        points: 10,
        explanation: 'They are all words shouted during the operatic section of Queen\'s "Bohemian Rhapsody" (Scaramouche, Fandango, Thunderbolt, Galileo, Figaro, Magnifico, Bismillah, Beelzebub, Mamma Mia).'
      }
    ]
  },
  {
    id: 'pack-ikea-or-swear',
    title: 'IKEA Chair or Swedish Swear?',
    description: 'Guess whether each word is an IKEA chair or a Swedish swear word.',
    questions: [
      {
        id: 'chair_1',
        type: 'MCQ',
        category: 'IKEA or Swear?',
        question: 'Jävlar — Is it a sleek dining chair or a swear word?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'Swedish Swear',
        points: 10,
        explanation: 'Bonus translation (+1 pt): Devils / Damn it.'
      },
      {
        id: 'chair_2',
        type: 'MCQ',
        category: 'IKEA or Swear?',
        question: 'Sandsberg — Is it a sturdy office chair or a swear word?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'IKEA Chair',
        points: 10,
        explanation: 'It is a basic IKEA dining chair.'
      },
      {
        id: 'chair_3',
        type: 'MCQ',
        category: 'IKEA or Swear?',
        question: 'Kuk — Is it a minimalist stool or a swear word?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'Swedish Swear',
        points: 10,
        explanation: 'Bonus translation (+1 pt): Cock / Dick.'
      },
      {
        id: 'chair_4',
        type: 'MCQ',
        category: 'IKEA or Swear?',
        question: 'Poäng — Is it a classic lounge armchair or a swear word?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'IKEA Chair',
        points: 10,
        explanation: "One of IKEA's most famous bentwood armchairs."
      },
      {
        id: 'chair_5',
        type: 'MCQ',
        category: 'IKEA or Swear?',
        question: 'Fan — Is it a space-saving folding chair or a swear word?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'Swedish Swear',
        points: 10,
        explanation: 'Bonus translation (+1 pt): The Devil / Fuck.'
      },
      {
        id: 'chair_6',
        type: 'MCQ',
        category: 'IKEA or Swear?',
        question: 'Ekenäset — Is it a retro-style wooden armchair or a swear word?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'IKEA Chair',
        points: 10,
        explanation: 'A retro wooden armchair.'
      },
      {
        id: 'chair_7',
        type: 'MCQ',
        category: 'IKEA or Swear?',
        question: "Skit — Is it a brightly coloured children's chair or a swear word?",
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'Swedish Swear',
        points: 10,
        explanation: 'Bonus translation (+1 pt): Shit.'
      },
      {
        id: 'chair_8',
        type: 'MCQ',
        category: 'IKEA or Swear?',
        question: 'Dyvlinge — Is it a swivel easy chair or a swear word?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'IKEA Chair',
        points: 10,
        explanation: 'A low swivel easy chair.'
      },
      {
        id: 'chair_9',
        type: 'MCQ',
        category: 'IKEA or Swear?',
        question: 'Rövhål — Is it a comfortable padded dining chair or a swear word?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'Swedish Swear',
        points: 10,
        explanation: 'Bonus translation (+1 pt): Arsehole.'
      },
      {
        id: 'chair_10',
        type: 'MCQ',
        category: 'IKEA or Swear?',
        question: 'Strandmon — Is it a high-backed wing chair or a swear word?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'IKEA Chair',
        points: 10,
        explanation: "IKEA's classic wingback reading chair."
      }
    ]
  },
  ...CHASE_QUIZ_PACKS
];
