import { QuizPack } from '../types/quiz';

export const DEFAULT_QUIZ_PACKS: QuizPack[] = [
  {
    id: 'secret-singalong',
    title: 'The Secret Singalong Round',
    description: '13 "General Knowledge" questions. The first syllable of every answer reveals a legendary Beatles singalong ("Na, na na na... Hey Jude!")',
    category: 'Music & Wordplay',
    questions: [
      {
        id: 'singalong-1',
        type: 'TEXT',
        category: 'Food & Drink',
        question: 'What popular Tex-Mex snack consists of heated tortilla chips covered in melted cheese and jalapeños?',
        answer: 'Nachos',
        points: 10,
        explanation: 'Starts with "NA-" (1st syllable)'
      },
      {
        id: 'singalong-2',
        type: 'TEXT',
        category: 'Acronyms',
        question: 'In the acronym NHS, what does the letter N stand for?',
        answer: 'National',
        points: 10,
        explanation: 'Starts with "NA-" (2nd syllable)'
      },
      {
        id: 'singalong-3',
        type: 'TEXT',
        category: 'Geography',
        question: 'What is the Italian city widely considered to be the historical birthplace of pizza?',
        answer: 'Naples',
        points: 10,
        explanation: 'Starts with "NA-" (3rd syllable)'
      },
      {
        id: 'singalong-4',
        type: 'TEXT',
        category: 'Celebrity',
        question: 'What is the first name of the iconic British supermodel whose surname is Campbell?',
        answer: 'Naomi',
        points: 10,
        explanation: 'Starts with "NA-" (4th syllable)'
      },
      {
        id: 'singalong-5',
        type: 'TEXT',
        category: 'History',
        question: 'Who was the French military leader famously defeated at the Battle of Waterloo in 1815?',
        answer: 'Napoleon',
        points: 10,
        explanation: 'Starts with "NA-" (5th syllable)'
      },
      {
        id: 'singalong-6',
        type: 'TEXT',
        category: 'Pop Culture',
        question: 'In the Marvel Cinematic Universe, what is the real first name of the superhero Black Widow?',
        answer: 'Natasha',
        points: 10,
        explanation: 'Starts with "NA-" (6th syllable)'
      },
      {
        id: 'singalong-7',
        type: 'TEXT',
        category: 'Literature',
        question: 'What is the name of the magical fantasy world accessed through a wardrobe in the classic C.S. Lewis books?',
        answer: 'Narnia',
        points: 10,
        explanation: 'Starts with "NA-" (7th syllable)'
      },
      {
        id: 'singalong-8',
        type: 'TEXT',
        category: 'Music',
        question: 'In music, what word is used to describe a note that is neither sharp nor flat?',
        answer: 'Natural',
        points: 10,
        explanation: 'Starts with "NA-" (8th syllable)'
      },
      {
        id: 'singalong-9',
        type: 'TEXT',
        category: 'Vocabulary',
        question: 'What four-letter word can refer to a country\'s fleet of military ships, or a very dark shade of blue?',
        answer: 'Navy',
        points: 10,
        explanation: 'Starts with "NA-" (9th syllable)'
      },
      {
        id: 'singalong-10',
        type: 'TEXT',
        category: 'Sport',
        question: 'What is the surname of the female tennis legend who won a record nine Wimbledon singles titles?',
        answer: 'Navratilova',
        points: 10,
        explanation: 'Starts with "NA-" (10th syllable)'
      },
      {
        id: 'singalong-11',
        type: 'TEXT',
        category: 'Space & Science',
        question: 'Which independent US government agency is responsible for the civilian space program?',
        answer: 'NASA',
        points: 10,
        explanation: 'Starts with "NA-" (11th syllable)'
      },
      {
        id: 'singalong-12',
        type: 'TEXT',
        category: 'Vocabulary',
        question: 'What six-letter word refers to the period of a person\'s or thing\'s greatest success, popularity, or prime?',
        answer: 'Heyday',
        points: 10,
        explanation: 'Starts with "HEY-" (12th syllable)'
      },
      {
        id: 'singalong-13',
        type: 'TEXT',
        category: 'Film & Actors',
        question: 'What is the first name of the British actor who plays Iris\'s brother Graham in the beloved Christmas movie The Holiday?',
        answer: 'Jude (Law)',
        points: 15,
        explanation: 'Grand Reveal: Put the first syllables together: "Na, na na na na na na, na na na na, Hey Jude!"'
      }
    ]
  },
  {
    id: 'who-said-it',
    title: 'Who Said It: Gemma Collins, Miss Piggy, or Donald Trump?',
    description: 'Supreme narcissism, diva demands, and baffling boasts. Can teams tell the difference between the reality star, the Muppet, and the politician?',
    category: 'Comedy Quotes',
    questions: [
      {
        id: 'wsi-1',
        type: 'MCQ',
        category: 'Quotes',
        question: '"Part of the beauty of me is that I am very rich."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Donald Trump',
        points: 10,
        explanation: 'Donald Trump said this during a 2011 Good Morning America interview!'
      },
      {
        id: 'wsi-2',
        type: 'MCQ',
        category: 'Quotes',
        question: '"I’ve got a very, very, very high IQ. I’m basically a genius."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Gemma Collins',
        points: 10,
        explanation: 'Gemma Collins famously boasted this during Celebrity Big Brother.'
      },
      {
        id: 'wsi-3',
        type: 'MCQ',
        category: 'Quotes',
        question: '"I don\'t care what you think of me, unless you think I\'m absolutely wonderful."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Miss Piggy',
        points: 10,
        explanation: 'Classic quote from the glamorous Muppet diva herself.'
      },
      {
        id: 'wsi-4',
        type: 'MCQ',
        category: 'Quotes',
        question: '"I think I am actually humble. I think I\'m much more humble than you would understand."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Donald Trump',
        points: 10,
        explanation: 'A genuine quote from a 2016 interview on 60 Minutes.'
      },
      {
        id: 'wsi-5',
        type: 'MCQ',
        category: 'Quotes',
        question: '"I am a massive fan of the dictionary."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Gemma Collins',
        points: 10,
        explanation: 'Another classic, baffling GC reality TV quote.'
      },
      {
        id: 'wsi-6',
        type: 'MCQ',
        category: 'Quotes',
        question: '"Expressing your feelings is good. Especially if they\'re feelings of absolute adoration for me."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Miss Piggy',
        points: 10,
        explanation: 'Miss Piggy giving relationship advice.'
      },
      {
        id: 'wsi-7',
        type: 'MCQ',
        category: 'Quotes',
        question: '"I have never seen a thin person drinking Diet Coke."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Donald Trump',
        points: 10,
        explanation: 'A legendary 2012 tweet from Donald Trump!'
      },
      {
        id: 'wsi-8',
        type: 'MCQ',
        category: 'Quotes',
        question: '"I\'ve earned my divaship."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Gemma Collins',
        points: 10,
        explanation: 'Gemma Collins justifying her demands on reality television.'
      },
      {
        id: 'wsi-9',
        type: 'MCQ',
        category: 'Quotes',
        question: '"Sorry losers and haters, but my I.Q. is one of the highest, and you all know it! Please don\'t feel so stupid or insecure, it\'s not your fault."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Donald Trump',
        points: 10,
        explanation: 'A genuine Donald Trump tweet from 2013.'
      },
      {
        id: 'wsi-10',
        type: 'MCQ',
        category: 'Quotes',
        question: '"Beauty is in the eye of the beholder, and it may be necessary from time to time to give a stupid or misinformed beholder a black eye."',
        options: ['Gemma Collins', 'Miss Piggy', 'Donald Trump'],
        answer: 'Miss Piggy',
        points: 10,
        explanation: 'Miss Piggy\'s martial arts philosophy.'
      }
    ]
  },
  {
    id: 'one-star-reviews',
    title: 'Guess the Movie from the Genuine 1-Star Review!',
    description: '100% real, genuine 1-star reviews left by bewildered Amazon reviewers on cinema masterpieces.',
    category: 'Film & Comedy',
    questions: [
      {
        id: 'review-1',
        type: 'MCQ',
        category: 'Film Reviews',
        question: '"I wanted to like this film. But there\'s not a scary frame in the film... the characters to me were nothing more than fish food... Also, the music was boring. And what was with all the water? 1 star."',
        options: ['Jaws', 'Titanic', 'The Abyss', 'Finding Nemo'],
        answer: 'Jaws',
        points: 10,
        explanation: 'A 1-star review for Steven Spielberg\'s Jaws!'
      },
      {
        id: 'review-2',
        type: 'MCQ',
        category: 'Film Reviews',
        question: '"This was very confusing. Where were the other 2000? 1 star."',
        options: ['2001: A Space Odyssey', '1984', '300', 'Apollo 13'],
        answer: '2001: A Space Odyssey',
        points: 10,
        explanation: 'Stanley Kubrick\'s sci-fi masterpiece 2001: A Space Odyssey.'
      },
      {
        id: 'review-3',
        type: 'MCQ',
        category: 'Film Reviews',
        question: '"What\'s so great about it? It\'s like Stir Crazy, but without Gene Wilder. I didn\'t need to sit through 90 minutes just to see a guy going through a crap tube barfing up his guts. 1 star."',
        options: ['The Shawshank Redemption', 'The Green Mile', 'Escape from Alcatraz', 'Con Air'],
        answer: 'The Shawshank Redemption',
        points: 10,
        explanation: 'Ranked #1 on IMDb of all time: The Shawshank Redemption.'
      },
      {
        id: 'review-4',
        type: 'MCQ',
        category: 'Film Reviews',
        question: '"It ultimately boils down to some sisters trying to marry up... nothing really ever happens. It just goes on and on... There should have been explosions. And a dog. 1 star."',
        options: ['Pride & Prejudice', 'Little Women', 'Sense and Sensibility', 'Emma'],
        answer: 'Pride & Prejudice',
        points: 10,
        explanation: 'Review for Jane Austen\'s classic Pride & Prejudice.'
      },
      {
        id: 'review-5',
        type: 'MCQ',
        category: 'Film Reviews',
        question: '"Neil Armstrong definitely saw aliens, so I don\'t know why they left them out in the movie. 1 star."',
        options: ['First Man', 'Apollo 11', 'The Right Stuff', 'Interstellar'],
        answer: 'First Man',
        points: 10,
        explanation: 'Ryan Gosling\'s moon landing biopic First Man.'
      },
      {
        id: 'review-6',
        type: 'MCQ',
        category: 'Film Reviews',
        question: '"The effect that came across was just a feeling of repulsion... because he should only have said, \'Prepare to die,\' once instead of nattering on about it. 1 star."',
        options: ['The Princess Bride', 'Gladiator', 'Robin Hood', 'The Three Musketeers'],
        answer: 'The Princess Bride',
        points: 10,
        explanation: 'Inigo Montoya\'s iconic line in The Princess Bride!'
      },
      {
        id: 'review-7',
        type: 'MCQ',
        category: 'Film Reviews',
        question: '"Cold is a way better title. 1 star."',
        options: ['Frozen', 'Ice Age', 'The Day After Tomorrow', 'Snowpiercer'],
        answer: 'Frozen',
        points: 10,
        explanation: 'Review for Disney\'s Frozen.'
      },
      {
        id: 'review-8',
        type: 'MCQ',
        category: 'Film Reviews',
        question: '"The Eagles could have just flown the Fellowship to Mordor and saved 800 pages or so. Religious propaganda. 1 star."',
        options: ['The Lord of the Rings', 'The Hobbit', 'Harry Potter', 'The Chronicles of Narnia'],
        answer: 'The Lord of the Rings',
        points: 10,
        explanation: 'Review for The Lord of the Rings: The Fellowship of the Ring.'
      },
      {
        id: 'review-9',
        type: 'MCQ',
        category: 'Film Reviews',
        question: '"This movie was morally irreprehensible and ruined my evening. 1 star."',
        options: ['There Will Be Blood', 'No Country for Old Men', 'The Wolf of Wall Street', 'Pulp Fiction'],
        answer: 'There Will Be Blood',
        points: 10,
        explanation: 'Daniel Day-Lewis in Paul Thomas Anderson\'s There Will Be Blood.'
      },
      {
        id: 'review-10',
        type: 'MCQ',
        category: 'Film Reviews',
        question: '"The amount of plagiarism contained in this movie is staggering... It is the exact replica of the first movie "A New Hope". Even the title have the same meaning. 1 star."',
        options: ['Star Wars: The Force Awakens', 'Rogue One', 'Avatar', 'Spaceballs'],
        answer: 'Star Wars: The Force Awakens',
        points: 10,
        explanation: 'Review for Star Wars: Episode VII - The Force Awakens.'
      }
    ]
  },
  {
    id: 'bohemian-rhapsody',
    title: 'The "Is This The Real Life?" Round',
    description: 'Read out as standard general knowledge questions. The 10th question asks teams to spot the secret operatic Bohemian Rhapsody connection!',
    category: 'Music Secret Connection',
    questions: [
      {
        id: 'queen-1',
        type: 'TEXT',
        category: 'Theatre & History',
        question: 'In traditional 16th-century Italian commedia dell\'arte theatre, what was the name of the boastful but cowardly clown character who dressed all in black?',
        answer: 'Scaramouche',
        points: 10,
        explanation: 'Scaramouche, Scaramouche, will you do the Fandango?'
      },
      {
        id: 'queen-2',
        type: 'TEXT',
        category: 'Dance',
        question: 'What is the name of a lively Spanish and Portuguese dance in triple time, typically danced by a couple with guitars and castanets?',
        answer: 'Fandango',
        points: 10,
        explanation: '...will you do the Fandango?'
      },
      {
        id: 'queen-3',
        type: 'TEXT',
        category: 'Technology',
        question: 'Developed by Intel with Apple, what is the brand name of the high-speed interface represented by a downward-pointing lightning flash?',
        answer: 'Thunderbolt',
        points: 10,
        explanation: 'Thunderbolt and lightning, very very frightening me!'
      },
      {
        id: 'queen-4',
        type: 'TEXT',
        category: 'Science',
        question: 'Which Italian astronomer discovered the four largest moons of Jupiter in 1610, now named in his honour?',
        answer: 'Galileo (Galilei)',
        points: 10,
        explanation: 'Galileo, Galileo, Galileo Figaro Magnifico!'
      },
      {
        id: 'queen-5',
        type: 'TEXT',
        category: 'Animation',
        question: 'What is the name of Geppetto\'s pet tuxedo cat in the 1940 Disney animated film Pinocchio, sharing a name with the Barber of Seville?',
        answer: 'Figaro',
        points: 10,
        explanation: 'Galileo Figaro!'
      },
      {
        id: 'queen-6',
        type: 'TEXT',
        category: 'Disney',
        question: 'What is the name of the villainous, wish-granting King in the 2023 Disney animated musical film Wish?',
        answer: 'Magnifico (King Magnifico)',
        points: 10,
        explanation: 'Magnifico-o-o-o!'
      },
      {
        id: 'queen-7',
        type: 'TEXT',
        category: 'World Cultures',
        question: 'Translating to "In the name of God", what Arabic phrase is recited as the opening word of almost every chapter of the Quran?',
        answer: 'Bismillah',
        points: 10,
        explanation: 'Bismillah! No, we will not let you go!'
      },
      {
        id: 'queen-8',
        type: 'TEXT',
        category: 'Religion & Literature',
        question: 'Derived from a Philistine god in Ekron, what nine-letter name is often used as a synonym for Satan or the "prince of demons"?',
        answer: 'Beelzebub',
        points: 10,
        explanation: 'Beelzebub has a devil put aside for me!'
      },
      {
        id: 'queen-9',
        type: 'TEXT',
        category: 'Pop Music',
        question: 'What phrase, meaning "my mother" in Italian, was the title of a 1975 UK number one hit that ironically knocked Queen off the top spot?',
        answer: 'Mamma Mia',
        points: 10,
        explanation: 'Mamma mia, mamma mia, mamma mia let me go!'
      },
      {
        id: 'queen-10',
        type: 'TEXT',
        category: 'The Grand Connection',
        question: 'Look closely at your previous nine answers (Scaramouche, Fandango, Thunderbolt, Galileo, Figaro, Magnifico, Bismillah, Beelzebub, Mamma Mia). What is the specific connection between them all?',
        answer: 'Lyrics shouted in Queen\'s Bohemian Rhapsody (operatic section)',
        points: 20,
        explanation: 'Every answer is a lyric or character shouted during the legendary operatic section of Bohemian Rhapsody!'
      }
    ]
  },
  {
    id: 'ikea-or-swear',
    title: 'IKEA Chair or Swedish Swear?',
    description: 'Teams must guess whether each Swedish-sounding word is an actual chair sold by IKEA, or a real Swedish swear word/insult!',
    category: 'Comedy & Languages',
    questions: [
      {
        id: 'ikea-1',
        type: 'MCQ',
        category: 'Swedish Words',
        question: 'Jävlar: Is it an IKEA Chair or a Swedish Swear?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'Swedish Swear',
        points: 10,
        explanation: 'Swedish Swear! Translates to "Devils" or "Damn it!"'
      },
      {
        id: 'ikea-2',
        type: 'MCQ',
        category: 'Swedish Words',
        question: 'Sandsberg: Is it an IKEA Chair or a Swedish Swear?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'IKEA Chair',
        points: 10,
        explanation: 'IKEA Chair! A classic basic pine dining chair.'
      },
      {
        id: 'ikea-3',
        type: 'MCQ',
        category: 'Swedish Words',
        question: 'Kuk: Is it an IKEA Chair or a Swedish Swear?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'Swedish Swear',
        points: 10,
        explanation: 'Swedish Swear! Translates to male genitalia ("Cock/Dick"). Definitely not sold in flat-pack!'
      },
      {
        id: 'ikea-4',
        type: 'MCQ',
        category: 'Swedish Words',
        question: 'Poäng: Is it an IKEA Chair or a Swedish Swear?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'IKEA Chair',
        points: 10,
        explanation: 'IKEA Chair! One of the most famous bentwood armchairs in world history.'
      },
      {
        id: 'ikea-5',
        type: 'MCQ',
        category: 'Swedish Words',
        question: 'Fan: Is it an IKEA Chair or a Swedish Swear?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'Swedish Swear',
        points: 10,
        explanation: 'Swedish Swear! Translates to "The Devil" or "Fuck".'
      },
      {
        id: 'ikea-6',
        type: 'MCQ',
        category: 'Swedish Words',
        question: 'Ekenäset: Is it an IKEA Chair or a Swedish Swear?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'IKEA Chair',
        points: 10,
        explanation: 'IKEA Chair! A handsome mid-century retro wooden armchair.'
      },
      {
        id: 'ikea-7',
        type: 'MCQ',
        category: 'Swedish Words',
        question: 'Skit: Is it an IKEA Chair or a Swedish Swear?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'Swedish Swear',
        points: 10,
        explanation: 'Swedish Swear! Translates to "Shit".'
      },
      {
        id: 'ikea-8',
        type: 'MCQ',
        category: 'Swedish Words',
        question: 'Dyvlinge: Is it an IKEA Chair or a Swedish Swear?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'IKEA Chair',
        points: 10,
        explanation: 'IKEA Chair! A low swivel easy chair.'
      },
      {
        id: 'ikea-9',
        type: 'MCQ',
        category: 'Swedish Words',
        question: 'Rövhål: Is it an IKEA Chair or a Swedish Swear?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'Swedish Swear',
        points: 10,
        explanation: 'Swedish Swear! Translates directly to "Asshole".'
      },
      {
        id: 'ikea-10',
        type: 'MCQ',
        category: 'Swedish Words',
        question: 'Strandmon: Is it an IKEA Chair or a Swedish Swear?',
        options: ['IKEA Chair', 'Swedish Swear'],
        answer: 'IKEA Chair',
        points: 10,
        explanation: 'IKEA Chair! Their famous high-backed wingback reading chair.'
      }
    ]
  },
  {
    id: 'chase-celebrity',
    title: 'The Chase: Celebrity Cash Builder Master Archive',
    description: 'Rapid-fire buzzer cash builder questions faced by celebrities on ITV\'s The Chase.',
    category: 'TV Game Show',
    questions: [
      {
        id: 'chase-1',
        type: 'BUZZER',
        category: 'TV & Drama',
        question: 'The Greedy Blinders recipe book is based on what hit TV series?',
        answer: 'Peaky Blinders',
        points: 10,
        explanation: 'Answered correctly by David James on The Chase.'
      },
      {
        id: 'chase-2',
        type: 'BUZZER',
        category: 'Pop Culture',
        question: 'Washington National Cathedral has a gargoyle carved in the likeness of which Star Wars villain?',
        answer: 'Darth Vader',
        points: 10,
        explanation: 'Darth Vader gargoyle was placed on the northwest tower after a 1980s design contest.'
      },
      {
        id: 'chase-3',
        type: 'BUZZER',
        category: 'Board Games',
        question: 'What popular board game allows a maximum of 32 houses and 12 hotels?',
        answer: 'Monopoly',
        points: 10,
        explanation: 'Keith Chegwin got this right in his cash builder!'
      },
      {
        id: 'chase-4',
        type: 'BUZZER',
        category: 'Geography',
        question: 'What is the only country in the world that borders both the Caspian Sea and the Persian Gulf?',
        answer: 'Iran',
        points: 15,
        explanation: 'Iran is flanked by the Caspian Sea to the north and the Persian Gulf to the south.'
      },
      {
        id: 'chase-5',
        type: 'BUZZER',
        category: 'Science',
        question: 'What chemical element has the atomic number 79 and the Latin symbol Au?',
        answer: 'Gold (Aurum)',
        points: 10,
        explanation: 'Au comes from the Latin word aurum.'
      },
      {
        id: 'chase-6',
        type: 'BUZZER',
        category: 'Astronomy',
        question: 'Which planet in our solar system rotates clockwise on its axis (retrograde rotation), opposite to most other planets?',
        answer: 'Venus (also Uranus has extreme tilt)',
        points: 10,
        explanation: 'Venus rotates east to west, so the Sun rises in the west!'
      },
      {
        id: 'chase-7',
        type: 'BUZZER',
        category: 'Music',
        question: 'How many keys are there on a standard full-size modern acoustic piano?',
        answer: '88 keys (52 white, 36 black)',
        points: 10,
        explanation: 'Standard acoustic grand or upright piano has 88 keys.'
      },
      {
        id: 'chase-8',
        type: 'BUZZER',
        category: 'Food & Cooking',
        question: 'What Jamaican seasoning is mainly flavored with allspice and Scotch bonnet peppers?',
        answer: 'Jerk seasoning',
        points: 10,
        explanation: 'Answered correctly by Carrie Grant.'
      }
    ]
  },
  {
    id: 'media-rich-trivia',
    title: 'Media-Rich Pop Culture & Visual Showcase',
    description: 'High-definition photo rounds, album artworks, and landmark challenges.',
    category: 'Visual & Media',
    questions: [
      {
        id: 'media-1',
        type: 'MCQ',
        category: 'Landmarks',
        question: 'Identify this iconic architectural wonder located on Sydney Harbour, Australia:',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1523428096881-5cb79904780c?w=900&auto=format&fit=crop&q=80',
        options: ['Sydney Opera House', 'Guggenheim Bilbao', 'Lotus Temple Delhi', 'Valencia City of Arts'],
        answer: 'Sydney Opera House',
        points: 10,
        explanation: 'Designed by Danish architect Jørn Utzon and formally opened in 1973.'
      },
      {
        id: 'media-2',
        type: 'MCQ',
        category: 'Astronomy',
        question: 'Which astronomical body is pictured here with its famous rings composed largely of water ice and rock?',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=900&auto=format&fit=crop&q=80',
        options: ['Saturn', 'Jupiter', 'Neptune', 'Uranus'],
        answer: 'Saturn',
        points: 10,
        explanation: 'Christiaan Huygens first recognized the true nature of Saturn\'s rings in 1655.'
      },
      {
        id: 'media-3',
        type: 'MCQ',
        category: 'Art & History',
        question: 'Painted by Leonardo da Vinci between 1503 and 1506, what is the world-famous title of this portrait in the Louvre?',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=900&auto=format&fit=crop&q=80',
        options: ['Mona Lisa', 'The Girl with a Pearl Earring', 'The Birth of Venus', 'Lady with an Ermine'],
        answer: 'Mona Lisa',
        points: 10,
        explanation: 'Known in Italian as La Gioconda, portraying Lisa Gherardini.'
      },
      {
        id: 'media-4',
        type: 'MCQ',
        category: 'Wonders of the World',
        question: 'Which ancient wonder, built in Agra from ivory-white marble by Mughal Emperor Shah Jahan, is pictured below?',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=900&auto=format&fit=crop&q=80',
        options: ['Taj Mahal', 'Red Fort', 'Humayun\'s Tomb', 'Fatehpur Sikri'],
        answer: 'Taj Mahal',
        points: 10,
        explanation: 'Commissioned in 1631 by Emperor Shah Jahan to house the tomb of his favorite wife Mumtaz Mahal.'
      }
    ]
  }
];
