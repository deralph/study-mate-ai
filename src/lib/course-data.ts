// Faculty of Computing course catalog
// Source: Faculty of Computing departmental syllabus / course structure document (AAUA).
// This file is the single source of truth the whole app uses to scope
// sign-up, recommendations, material search and the exam planner to
// ONLY the courses actually offered by the Faculty of Computing.

export type Semester = 1 | 2;
export type LevelNum = 100 | 200 | 300 | 400;

export interface Department {
  id: string;
  name: string;
  shortName: string;
  /** Course-code prefixes that are "home" (indigenous) courses for this department */
  homePrefixes: string[];
}

export interface Course {
  code: string;
  title: string;
  units: number;
  status: 'C' | 'E'; // Compulsory | Elective
  level: LevelNum;
  semester: Semester;
  /** Department id(s) this course is offered under (a course can be shared/core in one dept and elective in another) */
  departments: string[];
  /** Short list of syllabus topics/keywords, used for search + "what to study" recommendations */
  topics: string[];
}

export const DEPARTMENTS: Department[] = [
  { id: 'csc', name: 'Computer Science', shortName: 'CSC', homePrefixes: ['COS', 'CSC', 'AAUA-CSC'] },
  { id: 'cyb', name: 'Cyber Security', shortName: 'CYB', homePrefixes: ['CYB', 'AAUA-CYB'] },
  { id: 'dts', name: 'Data Science', shortName: 'DTS', homePrefixes: ['DTS', 'AAUA-DTS'] },
  { id: 'sen', name: 'Software Engineering', shortName: 'SEN', homePrefixes: ['SEN', 'AAUA-SEN'] },
  { id: 'ins', name: 'Information Systems', shortName: 'INS', homePrefixes: ['INS', 'AAUA-INS'] },
];

export const LEVELS: LevelNum[] = [100, 200, 300, 400];

const ALL = DEPARTMENTS.map(d => d.id); // courses shared by every dept in year 1

// ─────────────────────────────────────────────────────────────────────────
// 100 LEVEL — identical across all five departments (general foundation year)
// ─────────────────────────────────────────────────────────────────────────
const L100: Course[] = [
  { code: 'GST 111', title: 'Communication in English', units: 2, status: 'C', level: 100, semester: 1, departments: ALL,
    topics: ['sound patterns', 'grammar and usage', 'logical and critical thinking', 'comprehension strategies', 'report writing', 'essay writing'] },
  { code: 'MTH 101', title: 'Elementary Mathematics I (Algebra & Trigonometry)', units: 2, status: 'C', level: 100, semester: 1, departments: ALL,
    topics: ['set theory', 'real numbers', 'mathematical induction', 'quadratic equations', 'binomial theorem', 'complex numbers', 'trigonometric functions'] },
  { code: 'PHY 101', title: 'General Physics I (Mechanics)', units: 2, status: 'C', level: 100, semester: 1, departments: ALL,
    topics: ['vectors and scalars', 'kinematics', "Newton's laws of motion", 'momentum', 'work and energy', 'rotational motion', 'gravitation'] },
  { code: 'PHY 107', title: 'General Practical Physics I', units: 1, status: 'C', level: 100, semester: 1, departments: ALL,
    topics: ['measurement errors', 'graphical analysis', 'mechanical experiments'] },
  { code: 'COS 101', title: 'Introduction to Computing Science', units: 3, status: 'C', level: 100, semester: 1, departments: ALL,
    topics: ['history of computing', 'input/output devices', 'hardware & software', 'computing applications', 'operating systems basics', 'the internet'] },
  { code: 'BIO 101', title: 'General Biology I', units: 2, status: 'C', level: 100, semester: 1, departments: ALL, topics: ['cell biology', 'classification'] },
  { code: 'STA 111', title: 'Descriptive Statistics', units: 3, status: 'C', level: 100, semester: 1, departments: ALL,
    topics: ['probability', 'permutation and combination', 'random variables', 'binomial distribution', 'normal distribution', 'sampling distributions'] },
  { code: 'AAUA-CSC 103', title: 'Computer Hardware & Installation Management', units: 2, status: 'C', level: 100, semester: 1, departments: ALL,
    topics: ['computer hardware architecture', 'CPU', 'memory devices', 'motherboard', 'installation procedures', 'troubleshooting'] },
  { code: 'AAUA-CSC 111', title: 'Statistical Computing', units: 2, status: 'C', level: 100, semester: 1, departments: ALL,
    topics: ['types of statistics', 'measures of central tendency', 'measures of dispersion', 'Microsoft Excel', 'frequency distribution'] },

  { code: 'GST 112', title: 'Nigerian Peoples and Culture', units: 2, status: 'C', level: 100, semester: 2, departments: ALL,
    topics: ['Nigerian history', 'colonial administration', 'nation building', 'citizenship', 'national values'] },
  { code: 'MTH 102', title: 'Elementary Mathematics II (Calculus)', units: 2, status: 'C', level: 100, semester: 2, departments: ALL,
    topics: ['functions', 'limits and continuity', 'differentiation', 'curve sketching', 'integration', 'definite integrals'] },
  { code: 'PHY 102', title: 'General Physics II (Electricity & Magnetism)', units: 2, status: 'C', level: 100, semester: 2, departments: ALL,
    topics: ['electrostatics', "Coulomb's law", "Gauss's law", 'capacitance', 'DC circuits', "Ohm's law", 'magnetic fields', 'electromagnetic induction'] },
  { code: 'PHY 108', title: 'General Practical Physics II', units: 1, status: 'C', level: 100, semester: 2, departments: ALL, topics: ['electrical experiments', 'measurement techniques'] },
  { code: 'COS 102', title: 'Problem Solving Programming Techniques (VB/C)', units: 2, status: 'C', level: 100, semester: 2, departments: ALL,
    topics: ['algorithms', 'flowcharts', 'pseudocode', 'decision tables', 'problem-solving process', 'introductory programming in C/Python'] },
  { code: 'MTH 104', title: 'Elementary Mathematics III (Vectors, Geometry and Dynamics)', units: 2, status: 'C', level: 100, semester: 2, departments: ALL,
    topics: ['vectors in 1-3 dimensions', 'coordinate geometry', 'kinematics of a particle', 'projectiles', 'simple pendulum'] },
  { code: 'BIO 102', title: 'General Biology II', units: 2, status: 'C', level: 100, semester: 2, departments: ALL, topics: ['genetics', 'physiology'] },
  { code: 'AAUA-CSC 112', title: 'Computer Graphics & Image Processing', units: 2, status: 'C', level: 100, semester: 2, departments: ALL,
    topics: ['computer graphics algorithms', 'colour theory', '2D transformation', 'clipping', 'shading', 'animation basics', '3D transformations'] },
  { code: 'AAUA-CYB 102', title: 'Internet and Its Application', units: 2, status: 'C', level: 100, semester: 2, departments: ALL,
    topics: ['internet connection concepts', 'email', 'web browsers', 'search engines', 'online safety basics'] },
];

// ─────────────────────────────────────────────────────────────────────────
// 200-400 LEVEL — department specific
// ─────────────────────────────────────────────────────────────────────────

const csc: Course[] = [
  { code: 'COS 201', title: 'Computer Programming I (C++/Java)', units: 3, status: 'C', level: 200, semester: 1, departments: ['csc'],
    topics: ['object-oriented programming', 'classes and objects', 'inheritance', 'polymorphism', 'arrays', 'recursion'] },
  { code: 'CSC 203', title: 'Discrete Structures', units: 2, status: 'C', level: 200, semester: 1, departments: ['csc'],
    topics: ['propositional logic', 'predicate logic', 'sets and functions', 'mathematical induction', 'pigeonhole principle', 'recurrence relations'] },
  { code: 'ENT 211', title: 'Entrepreneurship and Innovation', units: 2, status: 'C', level: 200, semester: 1, departments: ALL, topics: ['entrepreneurship', 'business plan', 'innovation'] },
  { code: 'MTH 201', title: 'Mathematical Methods I', units: 2, status: 'C', level: 200, semester: 1, departments: ['csc', 'ins'], topics: ['partial derivatives', 'Taylor series', 'Lagrange multipliers', 'multiple integrals'] },
  { code: 'MTH 205', title: 'Linear Algebra I', units: 2, status: 'C', level: 200, semester: 1, departments: ['csc'], topics: ['vector space', 'linear independence', 'linear transformations', 'matrices'] },
  { code: 'IFT 203', title: 'Introduction to Web Technologies', units: 2, status: 'C', level: 200, semester: 1, departments: ['csc'], topics: ['HTML', 'CSS', 'HTTP/HTTPS', 'JavaScript basics', 'web development frameworks'] },
  { code: 'SEN 201', title: 'Introduction to Software Engineering', units: 2, status: 'C', level: 200, semester: 1, departments: ALL,
    topics: ['software processes', 'software lifecycle', 'requirements and specification', 'software design', 'software testing', 'project management'] },
  { code: 'AAUA-CSC 203', title: 'Assembly Language Programming', units: 2, status: 'C', level: 200, semester: 1, departments: ['csc'],
    topics: ['assembly fundamentals', 'processor architecture', 'data transfer instructions', 'addressing modes', 'JMP/LOOP instructions'] },
  { code: 'AAUA-SEN 201', title: 'Introduction to Scripting and Programming with Java', units: 2, status: 'C', level: 200, semester: 1, departments: ['csc'],
    topics: ['Java syntax', 'OOP in Java', 'secure coding basics', 'scripting for automation'] },
  { code: 'IFT 211', title: 'Digital Logic Design', units: 2, status: 'C', level: 200, semester: 1, departments: ['csc'],
    topics: ['boolean algebra', 'combinational circuits', 'sequential circuits', 'flip-flops', 'registers and counters'] },

  { code: 'MTH 202', title: 'Mathematical Method II', units: 2, status: 'C', level: 200, semester: 2, departments: ['csc'], topics: ['differential equations', 'series solutions'] },
  { code: 'GST 212', title: 'Philosophy, Logic and Human Existence', units: 2, status: 'C', level: 200, semester: 2, departments: ALL, topics: ['logic', 'syllogism', 'critical thinking'] },
  { code: 'COS 202', title: 'Computer Programming II (Python)', units: 3, status: 'C', level: 200, semester: 2, departments: ['csc'],
    topics: ['advanced OOP', 'abstract classes and interfaces', 'iterators', 'exception handling', 'event-driven programming', 'GUI programming'] },
  { code: 'IFT 212', title: 'Computer Architecture and Organisation', units: 2, status: 'C', level: 200, semester: 2, departments: ['csc'],
    topics: ['CPU organisation', 'instruction set architecture', 'addressing modes', 'memory hierarchy', 'cache memory', 'RISC'] },
  { code: 'INS 204', title: 'System Analysis and Design', units: 2, status: 'C', level: 200, semester: 2, departments: ['csc'],
    topics: ['SDLC', 'dataflow diagramming', 'entity relationship modelling', 'user interface design'] },
  { code: 'AAUA-CSC 202', title: 'File Organization & Data Processing', units: 2, status: 'C', level: 200, semester: 2, departments: ['csc'],
    topics: ['file structures', 'indexing', 'hashing', 'B-trees', 'data processing stages'] },
  { code: 'AAUA-SEN 202', title: 'Introduction to Software Engineering II', units: 2, status: 'C', level: 200, semester: 2, departments: ['csc'],
    topics: ['requirements analysis', 'software architecture and design', 'design patterns', 'testing types', 'CI/CD'] },
  { code: 'DTS 204', title: 'Statistical Computing Inference and Modelling', units: 3, status: 'C', level: 200, semester: 2, departments: ['csc'],
    topics: ['sampling distributions', 'estimation', 'hypothesis testing', 'regression and correlation'] },

  { code: 'SEN 301', title: 'Object Oriented Analysis and Design', units: 2, status: 'C', level: 300, semester: 1, departments: ['csc'],
    topics: ['UML', 'use case diagrams', 'class diagrams', 'state chart diagrams', 'component and deployment diagrams'] },
  { code: 'CSC 301', title: 'Data Structures and Algorithm', units: 3, status: 'C', level: 300, semester: 1, departments: ['csc'],
    topics: ['arrays and records', 'stacks and queues', 'trees', 'linked structures', 'pointers and references'] },
  { code: 'CYB 301', title: 'Cryptography Techniques, Algorithms and Application', units: 2, status: 'C', level: 300, semester: 1, departments: ['csc'],
    topics: ['symmetric and asymmetric cryptography', 'block and stream ciphers', 'hash functions', 'RSA', 'digital signatures', 'PKI'] },
  { code: 'CSC 309', title: 'Artificial Intelligence', units: 2, status: 'C', level: 300, semester: 1, departments: ['csc'],
    topics: ['intelligent agents', 'search algorithms', 'knowledge representation', 'NLP basics', 'expert systems', 'machine learning intro'] },
  { code: 'INS 311', title: 'E-Business Systems Development', units: 2, status: 'C', level: 300, semester: 1, departments: ['csc'],
    topics: ['e-business applications', 'web authoring tools', 'e-security challenges'] },
  { code: 'AAUA-CSC 301', title: 'Automata Theory and Formal Language', units: 2, status: 'C', level: 300, semester: 1, departments: ['csc'],
    topics: ['finite automata', 'regular grammar', 'context-free languages', 'pushdown automata', 'Turing machines'] },
  { code: 'AAUA-DTS 303', title: 'Machine Learning', units: 2, status: 'C', level: 300, semester: 1, departments: ['csc'],
    topics: ['supervised learning', 'unsupervised learning', 'regression', 'classification', 'neural networks', 'decision trees', 'clustering'] },
  { code: 'AAUA-SEN 311', title: 'Secure Coding', units: 2, status: 'C', level: 300, semester: 1, departments: ['csc'],
    topics: ['defensive coding', 'common vulnerabilities', 'secure coding in C/C++/Java/Python', 'penetration and unit testing'] },

  { code: 'SIWES 398', title: 'SIWES (Industrial Training)', units: 15, status: 'C', level: 300, semester: 2, departments: ALL, topics: ['industrial attachment', 'report writing', 'logbook'] },

  { code: 'CSC 401', title: 'Algorithms and Complexity Analysis', units: 2, status: 'C', level: 400, semester: 1, departments: ['csc'],
    topics: ['asymptotic analysis', 'complexity classes', 'recursive algorithm analysis', 'sorting algorithms', 'binary search trees', 'hash tables', 'graphs'] },
  { code: 'COS 409', title: 'Research Methodology and Technical Report Writing', units: 2, status: 'C', level: 400, semester: 1, departments: ALL,
    topics: ['research methods', 'literature review', 'sampling design', 'data analysis', 'report writing standards'] },
  { code: 'INS 401', title: 'Project Management', units: 2, status: 'C', level: 400, semester: 1, departments: ['csc'], topics: ['project lifecycle', 'scheduling', 'risk management'] },
  { code: 'CSC 497', title: 'Final Year Project I (Seminar)', units: 3, status: 'C', level: 400, semester: 1, departments: ALL, topics: ['research proposal', 'project scope'] },
  { code: 'AAUA-CSC 403', title: 'Web Programming', units: 2, status: 'C', level: 400, semester: 1, departments: ['csc'], topics: ['servlets', 'JSP', 'PHP', 'JDBC', 'MVC design'] },
  { code: 'AAUA-SEN 405', title: 'Formal Methods in Software Development', units: 2, status: 'C', level: 400, semester: 1, departments: ['csc'], topics: ['propositions', 'Z notation', 'formal specification', 'software design strategies'] },

  { code: 'CSC 402', title: 'Ethics and Legal Issues in Computer Science', units: 2, status: 'C', level: 400, semester: 2, departments: ['csc'], topics: ['professional ethics', 'IP', 'computer security policy', 'privacy'] },
  { code: 'CSC 498', title: 'Final Year Project II', units: 3, status: 'C', level: 400, semester: 2, departments: ALL, topics: ['implementation', 'evaluation', 'defence'] },
  { code: 'ENT 312', title: 'Venture Creation', units: 2, status: 'C', level: 400, semester: 2, departments: ALL, topics: ['opportunity identification', 'business plan', 'entrepreneurial finance'] },
  { code: 'GST 312', title: 'Peace and Conflict Resolution', units: 2, status: 'C', level: 400, semester: 2, departments: ALL, topics: ['conflict theory', 'peace building', 'mediation'] },
  { code: 'DTS 404', title: 'Data Management I', units: 3, status: 'C', level: 400, semester: 2, departments: ['csc'], topics: ['DBMS', 'relational data models', 'query processing', 'concurrency and recovery'] },
  { code: 'CSC 408', title: 'Operating Systems', units: 3, status: 'C', level: 400, semester: 2, departments: ['csc'],
    topics: ['process management', 'CPU scheduling', 'memory management', 'virtual memory', 'file systems', 'deadlocks', 'Linux/Unix'] },
  { code: 'CSC 422', title: 'Computer Science Innovation and New Technologies', units: 2, status: 'C', level: 400, semester: 2, departments: ['csc'], topics: ['innovation concepts', 'digital marketing', 'business models'] },
];

const cyb: Course[] = [
  { code: 'COS 201', title: 'Computer Programming I (C++/Java)', units: 3, status: 'C', level: 200, semester: 1, departments: ['cyb'], topics: ['object-oriented programming', 'classes and objects', 'inheritance', 'polymorphism'] },
  { code: 'CSC 203', title: 'Discrete Structures', units: 2, status: 'C', level: 200, semester: 1, departments: ['cyb'], topics: ['propositional logic', 'sets and functions', 'proof techniques', 'recurrence relations'] },
  { code: 'ENT 211', title: 'Entrepreneurship and Innovation', units: 2, status: 'C', level: 200, semester: 1, departments: ALL, topics: ['entrepreneurship', 'business plan'] },
  { code: 'MAT 201', title: 'Mathematical Methods I', units: 2, status: 'C', level: 200, semester: 1, departments: ['cyb'], topics: ['partial derivatives', 'multiple integrals'] },
  { code: 'INS 207', title: 'Introduction to Information Systems', units: 2, status: 'C', level: 200, semester: 1, departments: ['cyb'], topics: ['information systems concepts', 'systems development life cycle', 'database management'] },
  { code: 'SEN 201', title: 'Introduction to Software Engineering', units: 2, status: 'C', level: 200, semester: 1, departments: ['cyb'], topics: ['software processes', 'requirements', 'software design'] },
  { code: 'STA 121', title: 'Statistical Inference I', units: 3, status: 'C', level: 200, semester: 1, departments: ['cyb'], topics: ['estimation', 'hypothesis testing'] },
  { code: 'AAUA-INS 201', title: 'Strategy Development', units: 2, status: 'C', level: 200, semester: 1, departments: ['cyb'], topics: ['IT strategy', 'IT governance', 'business analysis'] },
  { code: 'AAUA-INS 203', title: 'Implications of Information Systems for People, Enterprises and Society', units: 2, status: 'C', level: 200, semester: 1, departments: ['cyb'], topics: ['privacy', 'digital divide', 'e-government', 'cybersecurity laws'] },

  { code: 'GST 212', title: 'Philosophy, Logic and Human Existence', units: 2, status: 'C', level: 200, semester: 2, departments: ALL, topics: ['logic', 'critical thinking'] },
  { code: 'COS 202', title: 'Computer Programming II (Python)', units: 3, status: 'C', level: 200, semester: 2, departments: ['cyb'], topics: ['advanced OOP', 'exception handling', 'GUI programming'] },
  { code: 'INS 202', title: 'Human Computer Interaction', units: 2, status: 'C', level: 200, semester: 2, departments: ['cyb'], topics: ['interaction styles', 'interface design rules', 'usability evaluation'] },
  { code: 'INS 204', title: 'System Analysis and Design', units: 2, status: 'C', level: 200, semester: 2, departments: ['cyb'], topics: ['SDLC', 'dataflow diagramming', 'entity relationship modelling'] },
  { code: 'BUA 102', title: 'Introduction to Business II', units: 2, status: 'C', level: 200, semester: 2, departments: ['cyb'], topics: ['management principles', 'business functions'] },
  { code: 'AAUA-INS 202', title: 'File Organization & Data Processing', units: 2, status: 'C', level: 200, semester: 2, departments: ['cyb'], topics: ['file structures', 'indexing', 'hashing'] },
  { code: 'AAUA-CSC 218', title: 'Introduction to Data Communication', units: 2, status: 'C', level: 200, semester: 2, departments: ['cyb'], topics: ['transmission media', 'multiplexing', 'error detection and correction', 'data switching'] },

  { code: 'INS 301', title: 'Business Process Management', units: 2, status: 'C', level: 300, semester: 1, departments: ['cyb'], topics: ['process-oriented view', 'business process modelling'] },
  { code: 'CYB 305', title: 'Digital Forensics and Investigation Methods', units: 2, status: 'C', level: 300, semester: 1, departments: ['cyb'],
    topics: ['digital evidence', 'chain of custody', 'forensic acquisition tools', 'cyber trail', 'incident reporting'] },
  { code: 'ICT 305', title: 'Data Communications System and Networking', units: 3, status: 'C', level: 300, semester: 1, departments: ['cyb'],
    topics: ['transmission modes', 'OSI model', 'error control', 'LANs', 'client-server networks', 'IPv4/IPv6'] },
  { code: 'INS 305', title: 'Management Theory', units: 2, status: 'C', level: 300, semester: 1, departments: ['cyb'], topics: ['management theories', 'organisational conflict'] },
  { code: 'CSC 309', title: 'Artificial Intelligence', units: 2, status: 'C', level: 300, semester: 1, departments: ['cyb'], topics: ['intelligent agents', 'search algorithms', 'expert systems'] },
  { code: 'INS 311', title: 'E-Business Systems Development', units: 2, status: 'C', level: 300, semester: 1, departments: ['cyb'], topics: ['e-business applications', 'e-security'] },
  { code: 'AAUA-INS 303', title: 'Machine Learning', units: 2, status: 'C', level: 300, semester: 1, departments: ['cyb'], topics: ['supervised/unsupervised learning', 'neural networks'] },
  { code: 'AAUA-INS 305', title: 'Process Modelling and Solution', units: 2, status: 'E', level: 300, semester: 1, departments: ['cyb'], topics: ['BPMN', 'as-is/to-be process models', 'key performance indicators'] },

  { code: 'SIWES 398', title: 'SIWES (Industrial Training)', units: 15, status: 'C', level: 300, semester: 2, departments: ALL, topics: ['industrial attachment', 'report writing'] },

  { code: 'CYB 401', title: 'Systems Vulnerability Assessment and Testing', units: 2, status: 'C', level: 400, semester: 1, departments: ['cyb'],
    topics: ['penetration testing methodology', 'password cracking', 'social engineering', 'attack surface analysis', 'fuzz testing', 'patch management'] },
  { code: 'CYB 403', title: 'Cyber Threat Intelligence and Cyber Conflict', units: 2, status: 'C', level: 400, semester: 1, departments: ['cyb'],
    topics: ['threat intelligence lifecycle', 'kill chain', 'indicators of compromise', 'threat modelling'] },
  { code: 'CYB 405', title: 'Ethical Hacking and Reverse Engineering', units: 2, status: 'C', level: 400, semester: 1, departments: ['cyb'],
    topics: ['footprinting and reconnaissance', 'scanning networks', 'malware threats', 'SQL injection', 'session hijacking', 'reverse engineering'] },
  { code: 'CSC 409', title: 'Research Methodology and Technical Writing', units: 3, status: 'C', level: 400, semester: 1, departments: ['cyb'], topics: ['research methods', 'literature review', 'report writing'] },
  { code: 'INS 497', title: 'Final Year Project I (Seminar)', units: 3, status: 'C', level: 400, semester: 1, departments: ALL, topics: ['project proposal'] },
  { code: 'AAUA-CYB 407', title: 'Intrusion Propagation and Mitigation Techniques', units: 2, status: 'C', level: 400, semester: 1, departments: ['cyb'],
    topics: ['intrusion attacks', 'malware attacks', 'DDoS', 'IDS/IPS', 'incident response', 'risk assessment'] },
  { code: 'AAUA-CYB 413', title: 'AI in Cybersecurity', units: 2, status: 'C', level: 400, semester: 1, departments: ['cyb'],
    topics: ['ML in cybersecurity', 'anomaly detection', 'malware detection with AI', 'sentiment analysis', 'cybersecurity forensics with AI'] },

  { code: 'CYB 402', title: 'Steganography: Access Methods and Data Hiding', units: 2, status: 'C', level: 400, semester: 2, departments: ['cyb'],
    topics: ['steganography vs encryption', 'text/image/video/audio steganography', 'steganalysis', 'data hiding methods'] },
  { code: 'CYB 404', title: 'Cloud Computing Security', units: 2, status: 'C', level: 400, semester: 2, departments: ['cyb'],
    topics: ['cloud service models', 'cloud threats', 'virtualisation security', 'cloud audit', 'cloud security alliance'] },
  { code: 'CYB 406', title: 'Deep and Dark Web Security', units: 2, status: 'C', level: 400, semester: 2, departments: ['cyb'],
    topics: ['Tor and onion routing', 'dark web anonymity', 'VPNs', 'darknet risks and safety'] },
  { code: 'CYB 412', title: 'Biometrics Security', units: 2, status: 'C', level: 400, semester: 2, departments: ['cyb'],
    topics: ['biometric algorithms', 'authentication matching', 'error rates', 'privacy issues in biometrics'] },
  { code: 'CYB 414', title: 'Information and Big Data Security', units: 2, status: 'C', level: 400, semester: 2, departments: ['cyb'],
    topics: ['big data characteristics', 'data security lifecycle', 'information security risk management'] },
  { code: 'GST 312', title: 'Peace and Conflict Resolution', units: 2, status: 'C', level: 400, semester: 2, departments: ALL, topics: ['conflict theory', 'peace building'] },
  { code: 'ENT 312', title: 'Venture Creation', units: 2, status: 'C', level: 400, semester: 2, departments: ALL, topics: ['opportunity identification', 'business plan'] },
  { code: 'CYB 422', title: 'Cybersecurity Innovation and New Technology', units: 2, status: 'C', level: 400, semester: 2, departments: ['cyb'], topics: ['innovation concepts', 'business feasibility'] },
  { code: 'CYB 498', title: 'Final Year Project II', units: 3, status: 'C', level: 400, semester: 2, departments: ALL, topics: ['implementation', 'evaluation', 'defence'] },
];

const dts: Course[] = [
  { code: 'COS 201', title: 'Computer Programming I (C++/Java)', units: 3, status: 'C', level: 200, semester: 1, departments: ['dts'], topics: ['object-oriented programming', 'classes and objects'] },
  { code: 'CSC 203', title: 'Discrete Structures', units: 2, status: 'C', level: 200, semester: 1, departments: ['dts'], topics: ['propositional logic', 'sets and functions'] },
  { code: 'ENT 211', title: 'Entrepreneurship and Innovation', units: 2, status: 'C', level: 200, semester: 1, departments: ALL, topics: ['entrepreneurship'] },
  { code: 'MTH 203', title: 'Sets, Logic and Algebra I', units: 2, status: 'C', level: 200, semester: 1, departments: ['dts'], topics: ['set theory', 'binary logic', 'algebraic structures', 'rings and fields'] },
  { code: 'MTH 209', title: 'Introduction to Numerical Analysis', units: 2, status: 'C', level: 200, semester: 1, departments: ['dts'], topics: ['error analysis', 'interpolation', 'numerical differentiation and integration'] },
  { code: 'DTS 201', title: 'Introduction to Data Science', units: 2, status: 'C', level: 200, semester: 1, departments: ['dts'],
    topics: ['data science methodology', 'structured/unstructured data', 'data collection', 'data visualisation', 'predictive models'] },
  { code: 'DTS 211', title: 'Introduction to R Programming', units: 2, status: 'C', level: 200, semester: 1, departments: ['dts'], topics: ['R objects', 'vectors/matrices/data frames', 'control structures in R', 'debugging R code'] },

  { code: 'GST 212', title: 'Philosophy, Logic and Human Existence', units: 2, status: 'C', level: 200, semester: 2, departments: ALL, topics: ['logic', 'critical thinking'] },
  { code: 'COS 202', title: 'Computer Programming II (Python)', units: 3, status: 'C', level: 200, semester: 2, departments: ['dts'], topics: ['advanced OOP', 'exception handling'] },
  { code: 'DTS 204', title: 'Statistical Computing Inference & Modelling', units: 3, status: 'C', level: 200, semester: 2, departments: ['dts'], topics: ['sampling distributions', 'estimation', 'regression'] },
  { code: 'MTH 202', title: 'Elementary Differential Equations', units: 2, status: 'C', level: 200, semester: 2, departments: ['dts'], topics: ['first and second order equations', 'finite linear difference equations'] },
  { code: 'DTS 298', title: 'SIWES I', units: 3, status: 'C', level: 200, semester: 2, departments: ['dts'], topics: ['industrial attachment'] },
  { code: 'AAUA-INS 202', title: 'File Organization and Data Processing', units: 2, status: 'C', level: 200, semester: 2, departments: ['dts'], topics: ['file structures', 'hashing'] },
  { code: 'AAUA-ICT 218', title: 'Introduction to Data Communication', units: 2, status: 'C', level: 200, semester: 2, departments: ['dts'], topics: ['transmission media', 'multiplexing'] },

  { code: 'CSC 301', title: 'Data Structures and Algorithms', units: 3, status: 'C', level: 300, semester: 1, departments: ['dts'], topics: ['stacks, queues, trees', 'linked structures'] },
  { code: 'ICT 305', title: 'Data Communications and Networking', units: 3, status: 'C', level: 300, semester: 1, departments: ['dts'], topics: ['OSI model', 'LANs', 'error control'] },
  { code: 'CYB 201', title: 'Introduction to Cybersecurity and Strategy', units: 2, status: 'C', level: 300, semester: 1, departments: ['dts'], topics: ['confidentiality integrity availability', 'access control', 'risk management'] },
  { code: 'CYB 305', title: 'Digital Forensics and Investigation Methods', units: 2, status: 'C', level: 300, semester: 1, departments: ['dts'], topics: ['digital evidence', 'forensic tools'] },
  { code: 'CSC 309', title: 'Artificial Intelligence', units: 2, status: 'C', level: 300, semester: 1, departments: ['dts'], topics: ['intelligent agents', 'search', 'expert systems'] },
  { code: 'AAUA-DTS 303', title: 'Machine Learning', units: 2, status: 'C', level: 300, semester: 1, departments: ['dts'],
    topics: ['linear/logistic regression', 'neural networks', 'decision trees', 'naive Bayes', 'Bayesian networks', 'clustering', 'ROC curves'] },
  { code: 'AAUA-DTS 307', title: 'Robotics and Intelligence System', units: 2, status: 'C', level: 300, semester: 1, departments: ['dts'], topics: ['robotics fundamentals', 'agents and environments'] },

  { code: 'SIWES', title: 'SIWES Report / Site Visit / Logbook / Seminar', units: 15, status: 'C', level: 300, semester: 2, departments: ['dts'], topics: ['industrial attachment report'] },

  { code: 'INS 401', title: 'Project Management', units: 2, status: 'C', level: 400, semester: 1, departments: ['dts'], topics: ['project lifecycle', 'scheduling', 'risk'] },
  { code: 'DTS 403', title: 'Data Visualization for Data Driven Decision Making', units: 2, status: 'C', level: 400, semester: 1, departments: ['dts'],
    topics: ['data presentation methods', 'tables graphs images video', 'dashboards and storytelling', 'geospatial visualisation'] },
  { code: 'CSC 409', title: 'Research Methodology and Technical Report Writing', units: 3, status: 'C', level: 400, semester: 1, departments: ['dts'], topics: ['research methods', 'report writing'] },
  { code: 'DTS 497', title: 'Final Year Project I (Seminar)', units: 3, status: 'C', level: 400, semester: 1, departments: ['dts'], topics: ['research proposal'] },
  { code: 'AAUA-INS 401', title: 'Natural Language Processing', units: 2, status: 'C', level: 400, semester: 1, departments: ['dts'],
    topics: ['text preprocessing', 'tokenising/stemming/lemmatising', 'named entity recognition', 'machine translation', 'dialogue systems'] },
  { code: 'AAUA-DTS 411', title: 'Data Mining & Predictive Analytics', units: 2, status: 'C', level: 400, semester: 1, departments: ['dts'], topics: ['data mining techniques', 'predictive modelling'] },
  { code: 'AAUA-DTS 415', title: 'Soft Computing', units: 2, status: 'C', level: 400, semester: 1, departments: ['dts'], topics: ['fuzzy logic', 'neural networks', 'genetic algorithms'] },

  { code: 'GST 312', title: 'Peace and Conflict Resolution', units: 2, status: 'C', level: 400, semester: 2, departments: ALL, topics: ['conflict theory'] },
  { code: 'ENT 312', title: 'Venture Creation', units: 2, status: 'C', level: 400, semester: 2, departments: ALL, topics: ['business plan'] },
  { code: 'DTS 402', title: 'Big Data Computing', units: 2, status: 'C', level: 400, semester: 2, departments: ['dts'], topics: ['Hadoop', 'Spark', 'NoSQL', 'big data streaming'] },
  { code: 'DTS 404', title: 'Data Management I', units: 2, status: 'C', level: 400, semester: 2, departments: ['dts'], topics: ['DBMS', 'database design', 'query processing'] },
  { code: 'DTS 408', title: 'Ethics and Legal Issues in Data Science', units: 2, status: 'C', level: 400, semester: 2, departments: ['dts'], topics: ['data privacy', 'FAIR data principles', 'open data'] },
  { code: 'DTS 416', title: 'Probability for Data Science', units: 3, status: 'C', level: 400, semester: 2, departments: ['dts'], topics: ['random variables', "Bayes' theorem", 'Markov chains', 'central limit theorem'] },
  { code: 'DTS 422', title: 'Data Science Innovation and New Technology', units: 2, status: 'C', level: 400, semester: 2, departments: ['dts'], topics: ['innovation concepts', 'business models'] },
  { code: 'DTS 498', title: 'Final Year Project II', units: 3, status: 'C', level: 400, semester: 2, departments: ['dts'], topics: ['implementation', 'evaluation'] },
];

const sen: Course[] = [
  { code: 'COS 201', title: 'Computer Programming I (C++/Java)', units: 3, status: 'C', level: 200, semester: 1, departments: ['sen'], topics: ['object-oriented programming'] },
  { code: 'ICT 201', title: 'Introduction to Information and Communication Technology', units: 2, status: 'C', level: 200, semester: 1, departments: ['sen'], topics: ['data transmission', 'networks basics', 'ICT applications'] },
  { code: 'CYB 201', title: 'Introduction to Cybersecurity Strategy', units: 2, status: 'C', level: 200, semester: 1, departments: ['sen'], topics: ['CIA triad', 'risk management'] },
  { code: 'MTH 201', title: 'Mathematical Methods', units: 2, status: 'C', level: 200, semester: 1, departments: ['sen'], topics: ['partial derivatives', 'multiple integrals'] },
  { code: 'CSC 203', title: 'Discrete Structures', units: 2, status: 'C', level: 200, semester: 1, departments: ['sen'], topics: ['propositional logic', 'sets and functions'] },
  { code: 'ENT 211', title: 'Entrepreneurship and Innovation', units: 2, status: 'C', level: 200, semester: 1, departments: ALL, topics: ['entrepreneurship'] },
  { code: 'IFT 203', title: 'Introduction to Web Technologies', units: 2, status: 'C', level: 200, semester: 1, departments: ['sen'], topics: ['HTML/CSS', 'JavaScript', 'web standards'] },
  { code: 'AAUA-CSC 203', title: 'Assembly Language Programming', units: 2, status: 'C', level: 200, semester: 1, departments: ['sen'], topics: ['assembly fundamentals', 'addressing modes'] },

  { code: 'COS 202', title: 'Computer Programming II (Python)', units: 3, status: 'C', level: 200, semester: 2, departments: ['sen'], topics: ['advanced OOP', 'GUI programming'] },
  { code: 'INS 202', title: 'Human-Computer Interaction', units: 2, status: 'C', level: 200, semester: 2, departments: ['sen'], topics: ['interaction styles', 'GUI design', 'usability'] },
  { code: 'MTH 202', title: 'Elementary Differential Equations', units: 2, status: 'C', level: 200, semester: 2, departments: ['sen'], topics: ['first/second order equations'] },
  { code: 'GST 212', title: 'Philosophy, Logic and Human Existence', units: 2, status: 'C', level: 200, semester: 2, departments: ALL, topics: ['logic'] },
  { code: 'AAUA-CYB 202', title: 'System and Network Security Fundamentals', units: 3, status: 'C', level: 200, semester: 2, departments: ['sen'], topics: ['cryptography', 'Unix/Linux security', 'LAN security'] },
  { code: 'AAUA-ICT 218', title: 'Introduction to Data Communication', units: 2, status: 'C', level: 200, semester: 2, departments: ['sen'], topics: ['transmission media', 'multiplexing'] },
  { code: 'IFT 212', title: 'Computer Architecture and Organisation', units: 2, status: 'C', level: 200, semester: 2, departments: ['sen'], topics: ['CPU organisation', 'memory hierarchy'] },
  { code: 'AAUA-CYB 204', title: 'Introduction to Cybersecurity Threat and Exploits', units: 2, status: 'C', level: 200, semester: 2, departments: ['sen'], topics: ['attacks and vulnerabilities', 'basic hacking'] },

  { code: 'CYB 301', title: 'Cryptography Techniques, Algorithms and Applications', units: 2, status: 'C', level: 300, semester: 1, departments: ['sen'], topics: ['symmetric/asymmetric cryptography', 'RSA', 'digital signatures'] },
  { code: 'CYB 303', title: 'Cybersecurity, Risk Analysis Challenges and Mitigation', units: 2, status: 'C', level: 300, semester: 1, departments: ['sen'], topics: ['risk analysis', 'ISO 27000', 'incident response'] },
  { code: 'CYB 305', title: 'Digital Forensics and Investigation Methods', units: 2, status: 'C', level: 300, semester: 1, departments: ['sen'], topics: ['digital evidence', 'forensic acquisition'] },
  { code: 'ICT 305', title: 'Data Communications System and Networking', units: 3, status: 'C', level: 300, semester: 1, departments: ['sen'], topics: ['OSI model', 'LANs', 'protocols'] },
  { code: 'CSC 309', title: 'Artificial Intelligence', units: 2, status: 'C', level: 300, semester: 1, departments: ['sen'], topics: ['intelligent agents', 'search algorithms'] },
  { code: 'ICT 309', title: 'Mobile Communication & Network', units: 3, status: 'C', level: 300, semester: 1, departments: ['sen'], topics: ['cellular systems', 'GSM architecture', 'GPRS', 'GPS'] },
  { code: 'AAUA-DTS 303', title: 'Machine Learning', units: 3, status: 'C', level: 300, semester: 1, departments: ['sen'], topics: ['supervised/unsupervised learning', 'neural networks'] },
  { code: 'AAUA-SEN 311', title: 'Secure Coding', units: 2, status: 'C', level: 300, semester: 1, departments: ['sen'], topics: ['defensive coding', 'secure coding practices'] },

  { code: 'SIWES 398', title: 'SIWES (Industrial Training)', units: 15, status: 'C', level: 300, semester: 2, departments: ALL, topics: ['industrial attachment'] },

  { code: 'SEN 401', title: 'Software Configuration Management & Maintenance', units: 2, status: 'C', level: 400, semester: 1, departments: ['sen'],
    topics: ['software configuration management', 'change control', 'software maintenance types', 'reverse engineering'] },
  { code: 'INS 401', title: 'Project Management', units: 2, status: 'C', level: 400, semester: 1, departments: ['sen'], topics: ['project lifecycle', 'scheduling'] },
  { code: 'COS 409', title: 'Research Methodology and Technical Writing', units: 3, status: 'C', level: 400, semester: 1, departments: ['sen'], topics: ['research methods', 'report writing'] },
  { code: 'SEN 497', title: 'Final Year Project I (Seminar)', units: 3, status: 'C', level: 400, semester: 1, departments: ['sen'], topics: ['research proposal'] },
  { code: 'CYB 401', title: 'System Vulnerability Assessment and Testing', units: 2, status: 'C', level: 400, semester: 1, departments: ['sen'], topics: ['penetration testing', 'password cracking'] },
  { code: 'AAUA-SEN 403', title: 'Web Programming', units: 2, status: 'C', level: 400, semester: 1, departments: ['sen'], topics: ['servlets/JSP/PHP', 'JDBC'] },
  { code: 'AAUA-SEN 405', title: 'Formal Methods in Software Development', units: 2, status: 'C', level: 400, semester: 1, departments: ['sen'], topics: ['Z notation', 'formal specification'] },
  { code: 'AAUA-SEN 407', title: 'Application Packages', units: 2, status: 'C', level: 400, semester: 1, departments: ['sen'], topics: ['word processing', 'spreadsheets', 'CAD/CAE tools'] },

  { code: 'SEN 410', title: 'Software Architecture and Design', units: 2, status: 'C', level: 400, semester: 2, departments: ['sen'],
    topics: ['design patterns', 'middleware architectures', 'component based design', 'software metrics'] },
  { code: 'SEN 498', title: 'Final Year Project II', units: 3, status: 'C', level: 400, semester: 2, departments: ['sen'], topics: ['implementation', 'evaluation'] },
  { code: 'SEN 404', title: 'Software Testing & Quality Assurance', units: 2, status: 'C', level: 400, semester: 2, departments: ['sen'], topics: ['verification and validation', 'unit/integration/system testing', 'test automation'] },
  { code: 'SEN 406', title: 'Software Construction', units: 2, status: 'C', level: 400, semester: 2, departments: ['sen'], topics: ['construction fundamentals', 'coding standards', 'debugging', 'version control'] },
  { code: 'ENT 312', title: 'Venture Creation', units: 2, status: 'C', level: 400, semester: 2, departments: ALL, topics: ['business plan'] },
  { code: 'GST 312', title: 'Peace and Conflict Resolution', units: 2, status: 'C', level: 400, semester: 2, departments: ALL, topics: ['conflict theory'] },
  { code: 'CSC 408', title: 'Operating Systems', units: 3, status: 'C', level: 400, semester: 2, departments: ['sen'], topics: ['process management', 'scheduling', 'memory management', 'file systems'] },
  { code: 'SEN 422', title: 'Software Engineering Innovation and New Technology', units: 2, status: 'C', level: 400, semester: 2, departments: ['sen'], topics: ['software business ownership', 'entrepreneurial financing'] },
];

const ins: Course[] = [
  { code: 'COS 201', title: 'Computer Programming I (C++/Java)', units: 3, status: 'C', level: 200, semester: 1, departments: ['ins'], topics: ['object-oriented programming'] },
  { code: 'CSC 203', title: 'Discrete Structures', units: 2, status: 'C', level: 200, semester: 1, departments: ['ins'], topics: ['propositional logic', 'sets and functions'] },
  { code: 'ENT 211', title: 'Entrepreneurship and Innovation', units: 2, status: 'C', level: 200, semester: 1, departments: ALL, topics: ['entrepreneurship'] },
  { code: 'MTH 201', title: 'Mathematical Methods I', units: 2, status: 'C', level: 200, semester: 1, departments: ['ins'], topics: ['partial derivatives'] },
  { code: 'IFT 211', title: 'Digital Logic Design', units: 2, status: 'C', level: 200, semester: 1, departments: ['ins'], topics: ['boolean algebra', 'combinational and sequential circuits'] },
  { code: 'SEN 201', title: 'Introduction to Software Engineering I', units: 2, status: 'C', level: 200, semester: 1, departments: ['ins'], topics: ['software processes', 'requirements'] },
  { code: 'AAUA-CSC 201', title: 'Introduction to Computer Arithmetic', units: 2, status: 'E', level: 200, semester: 1, departments: ['ins'], topics: ['number systems', 'binary codes', "two's complement"] },
  { code: 'DTS 201', title: 'Introduction to Data Science', units: 2, status: 'C', level: 200, semester: 1, departments: ['ins'], topics: ['data science methodology', 'data visualisation'] },
  { code: 'DTS 211', title: 'Introduction to R Programming', units: 2, status: 'C', level: 200, semester: 1, departments: ['ins'], topics: ['R objects', 'data frames'] },

  { code: 'MTH 204', title: 'Linear Algebra II', units: 2, status: 'C', level: 200, semester: 2, departments: ['ins'], topics: ['systems of linear equations', 'eigenvalues and eigenvectors'] },
  { code: 'COS 202', title: 'Computer Programming II (Python)', units: 3, status: 'C', level: 200, semester: 2, departments: ['ins'], topics: ['advanced OOP'] },
  { code: 'GST 212', title: 'Philosophy, Logic and Human Existence', units: 2, status: 'C', level: 200, semester: 2, departments: ALL, topics: ['logic'] },
  { code: 'INS 204', title: 'System Analysis and Design', units: 2, status: 'C', level: 200, semester: 2, departments: ['ins'], topics: ['SDLC', 'ERD'] },
  { code: 'AAUA-CSC 202', title: 'File Organization & Data Processing', units: 2, status: 'C', level: 200, semester: 2, departments: ['ins'], topics: ['file structures', 'hashing'] },
  { code: 'AAUA-CSC 218', title: 'Introduction to Data Communication', units: 2, status: 'C', level: 200, semester: 2, departments: ['ins'], topics: ['transmission media'] },

  { code: 'CSC 301', title: 'Data Structures and Algorithm', units: 3, status: 'C', level: 300, semester: 1, departments: ['ins'], topics: ['stacks queues trees'] },
  { code: 'ICT 301', title: 'Satellite Communication', units: 2, status: 'C', level: 300, semester: 1, departments: ['ins'], topics: ['satellite orbits', 'link budget', 'TDMA/CDMA', 'VSAT'] },
  { code: 'CYB 301', title: 'Cryptography Techniques, Algorithms and Applications', units: 2, status: 'C', level: 300, semester: 1, departments: ['ins'], topics: ['symmetric/asymmetric cryptography'] },
  { code: 'ICT 305', title: 'Data Communication System & Network', units: 2, status: 'C', level: 300, semester: 1, departments: ['ins'], topics: ['OSI model', 'network protocols'] },
  { code: 'ICT 309', title: 'Mobile Communication and Network', units: 3, status: 'C', level: 300, semester: 1, departments: ['ins'], topics: ['cellular systems', 'GSM'] },
  { code: 'CSC 309', title: 'Artificial Intelligence', units: 2, status: 'C', level: 300, semester: 1, departments: ['ins'], topics: ['intelligent agents', 'expert systems'] },
  { code: 'AAUA-DTS 303', title: 'Machine Learning', units: 2, status: 'C', level: 300, semester: 1, departments: ['ins'], topics: ['supervised/unsupervised learning'] },

  { code: 'SIWES 398', title: 'SIWES (Industrial Training)', units: 15, status: 'C', level: 300, semester: 2, departments: ALL, topics: ['industrial attachment'] },

  { code: 'INS 401', title: 'Project Management', units: 2, status: 'C', level: 400, semester: 1, departments: ['ins'], topics: ['project lifecycle', 'scheduling'] },
  { code: 'DTS 403', title: 'Data Visualization for Data-driven Decision Making', units: 2, status: 'C', level: 400, semester: 1, departments: ['ins'], topics: ['data presentation', 'dashboards'] },
  { code: 'CSC 409', title: 'Research Methodology and Technical Report Writing', units: 2, status: 'C', level: 400, semester: 1, departments: ['ins'], topics: ['research methods', 'report writing'] },
  { code: 'ICT 497', title: 'Final Project I (Seminar)', units: 3, status: 'C', level: 400, semester: 1, departments: ['ins'], topics: ['research proposal'] },
  { code: 'AAUA-ICT 403', title: 'Web Programming', units: 2, status: 'C', level: 400, semester: 1, departments: ['ins'], topics: ['servlets/JSP/PHP'] },
  { code: 'AAUA-ICT 407', title: 'System Analysis and Design II', units: 2, status: 'C', level: 400, semester: 1, departments: ['ins'], topics: ['UML', 'use case diagrams', 'class diagrams'] },
  { code: 'AAUA-INS 401', title: 'Natural Language Processing', units: 2, status: 'C', level: 400, semester: 1, departments: ['ins'], topics: ['text preprocessing', 'text classification', 'NER'] },
  { code: 'AAUA-INS 403', title: 'Decision Support Systems', units: 2, status: 'C', level: 400, semester: 1, departments: ['ins'], topics: ['DSS development', 'expert systems', 'spreadsheet modelling'] },
  { code: 'AAUA-INS 405', title: 'Speech Processing', units: 2, status: 'C', level: 400, semester: 1, departments: ['ins'], topics: ['speech analysis', 'text-to-speech', 'speaker recognition'] },

  { code: 'CSC 408', title: 'Operating Systems', units: 3, status: 'C', level: 400, semester: 2, departments: ['ins'], topics: ['process management', 'memory management', 'file systems'] },
  { code: 'ICT 418', title: 'Design & Installation of Electrical & ICT Services', units: 2, status: 'C', level: 400, semester: 2, departments: ['ins'], topics: ['electrical installation', 'ICT services design'] },
  { code: 'ICT 422', title: 'ICT Innovation and Entrepreneurship', units: 2, status: 'C', level: 400, semester: 2, departments: ['ins'], topics: ['business leadership', 'digital marketing'] },
  { code: 'GST 312', title: 'Peace and Conflict Resolution', units: 2, status: 'C', level: 400, semester: 2, departments: ALL, topics: ['conflict theory'] },
  { code: 'ENT 312', title: 'Venture Creation', units: 2, status: 'C', level: 400, semester: 2, departments: ALL, topics: ['business plan'] },
  { code: 'CSC 432', title: 'Distributed Computing Systems', units: 3, status: 'C', level: 400, semester: 2, departments: ['ins'], topics: ['distributed algorithms', 'RPC', 'replication', 'fault tolerance'] },
  { code: 'AAUA-ICT 442', title: 'Wireless Communications and Networking', units: 3, status: 'C', level: 400, semester: 2, departments: ['ins'], topics: ['wireless transmission', 'Wi-Fi', 'WiMAX', 'Bluetooth'] },
  { code: 'ICT 498', title: 'Final Project II', units: 3, status: 'E', level: 400, semester: 2, departments: ['ins'], topics: ['implementation', 'evaluation'] },
];

// Faculty-wide electives students across departments may take (200-400L pool)
const facultyElectives: Course[] = [
  { code: 'ICT 201', title: 'Introduction to Information and Communication Technology', units: 2, status: 'E', level: 200, semester: 1, departments: ['csc', 'cyb', 'dts'], topics: ['data transmission', 'network types', 'ICT applications'] },
  { code: 'DTS 201', title: 'Introduction to Data Science', units: 2, status: 'E', level: 200, semester: 1, departments: ['csc', 'cyb'], topics: ['data collection', 'data visualisation'] },
  { code: 'CSC 432', title: 'Distributed Computing Systems', units: 2, status: 'E', level: 400, semester: 2, departments: ['csc', 'cyb', 'dts'], topics: ['distributed algorithms', 'consistency models'] },
  { code: 'CYB 302', title: 'Biometric Security', units: 2, status: 'E', level: 400, semester: 2, departments: ['csc'], topics: ['biometric authentication', 'accuracy metrics'] },
];

export const COURSES: Course[] = [
  ...L100,
  ...csc, ...cyb, ...dts, ...sen, ...ins,
  ...facultyElectives,
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getDepartment(id: string): Department | undefined {
  return DEPARTMENTS.find(d => d.id === id || d.name === id || d.shortName === id);
}

export function levelFromYearLabel(year: string): LevelNum {
  const n = parseInt(year, 10);
  if (n === 100 || n === 200 || n === 300 || n === 400) return n as LevelNum;
  return 100;
}

export function getCoursesForDept(deptId: string, level?: LevelNum, semester?: Semester): Course[] {
  return COURSES.filter(c =>
    c.departments.includes(deptId) &&
    (level === undefined || c.level === level) &&
    (semester === undefined || c.semester === semester)
  );
}

/** De-duplicate by course code (same course can appear for multiple departments) */
export function dedupeCourses(courses: Course[]): Course[] {
  const seen = new Set<string>();
  const out: Course[] = [];
  for (const c of courses) {
    if (!seen.has(c.code)) { seen.add(c.code); out.push(c); }
  }
  return out;
}

export function searchCourses(query: string, deptId?: string, level?: LevelNum): Course[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  let pool = deptId ? getCoursesForDept(deptId, level) : COURSES.filter(c => level === undefined || c.level === level);
  pool = dedupeCourses(pool);
  return pool.filter(c =>
    c.code.toLowerCase().replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) ||
    c.title.toLowerCase().includes(q) ||
    c.topics.some(t => t.toLowerCase().includes(q))
  );
}

export function findCourseByCode(code: string): Course | undefined {
  const norm = code.trim().toLowerCase().replace(/\s+/g, '');
  return COURSES.find(c => c.code.toLowerCase().replace(/\s+/g, '') === norm);
}
