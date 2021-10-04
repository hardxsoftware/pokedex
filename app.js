angular.module("pokemon", ["ngRoute", "ngLodash"]).config(["$routeProvider", "$sceDelegateProvider", function (e, n) {
    e.when("/", {
        // templateUrl: "views/home.html",
        // controller: "HomeController"
        templateUrl: "views/browse.html",
        controller: "BrowseController"
    }).when("/pokemon", {
        templateUrl: "views/browse.html",
        controller: "BrowseController"
    }).when("/search", {
        templateUrl: "views/search.html",
        controller: "PokemonNameController"
    }).when("/pokemon/:name", {
        templateUrl: "views/pokemon-detail.html",
        controller: "PokemonDetailController"
    }).otherwise({
        redirectTo: "/"
    }), n.resourceUrlWhitelist(["self", "https://pokeapi.co/api/v2/**"])
}]), angular.module('pokemon')
    .controller('BrowseController', ['$scope', '$http', '$routeParams', 'lodash', function ($scope, $http, $routeParams, lodash) {

        $scope.currentPage = parseInt($routeParams.page);
        var offset = '';
        if ($scope.currentPage === 1) {
            offset = 0;
        } else {
            offset = ($scope.currentPage - 1) * 898;
        }

        var formSpriteUrl = function (url) {
            var urlChunks = url.split('/');
            var id = urlChunks[6];
            return id;
        };

        var parsePokemon = function (results) {
            var pokemon = results.map(function (result) {
                return {
                    name: result.name,
                    sprite: formSpriteUrl(result.url)
                };
            });
            return pokemon;
        };

        var getPokemonByPage = function (offset) {
            $http.get('https://pokeapi.co/api/v2/pokemon/?limit=898' + '&offset=' + offset)
                .then(function (res) {
                    $scope.pages = lodash.range(1, Math.ceil(res.data.count / 898) + 1);
                    $scope.pokemon = parsePokemon(res.data.results);
                    $scope.loaded = true;
                }, function (err) {
                    $scope.error = true;
                    $scope.loaded = true;
                    console.log('Group retrieval failed.');
                });
        };

        getPokemonByPage(offset);

    }]), angular.module('pokemon')
        .controller('HomeController', ['$location', '$route', '$scope', function ($location, $route, $scope) {

            $scope.$watch(function () {
                return $location.path();
            }, function (value) {
                if (value === '/') {
                    $scope.home = true;
                } else {
                    $scope.home = false;
                }
            });
        }]), angular.module('pokemon')
            .controller('PokemonDetailController', ['$scope', 'PokemonDetailFactory',
                'PokemonEvolutionFactory', 'PokemonSpeciesFactory', '$routeParams', function ($scope, PokemonDetailFactory, PokemonEvolutionFactory, PokemonSpeciesFactory, $routeParams) {

                    $scope.name = $routeParams.name;
                    var directiveImageLoadedCount = 0;
                    var evolutionCount = 0;

                    // get number of evolutions for image tracking
                    var getEvolutionCount = function (evolution) {
                        var count = 1;
                        for (i = 0; i < evolution.chain.evolves_to.length; i++) {
                            count++;
                            for (z = 0; z < evolution.chain.evolves_to[i].evolves_to.length; z++) {
                                count++;
                            }
                        }
                        return count;
                    };

                    $scope.areImagesLoaded = function () {
                        directiveImageLoadedCount++;
                        if (evolutionCount === directiveImageLoadedCount && evolutionCount > 1) {
                            $scope.$apply(function () {
                                $scope.imagesLoaded = true;
                            });
                        } else if (evolutionCount === directiveImageLoadedCount && evolutionCount === 1) {
                            $scope.$apply(function () {
                                $scope.hideEvolutionResponse = true;
                            });
                        }

                    };

                    $scope.hideEvolution = function () {
                        $scope.hideEvolutionResponse = true;
                        console.log('hide evolution');
                    };

                    PokemonDetailFactory.getDetails($scope.name)
                        // get basic pokemon stats
                        .then(function (res) {
                            $scope.pokemon = PokemonDetailFactory.parsePersonalTraits(res.data);
                            return PokemonSpeciesFactory.getSpecies($scope.pokemon.species.url);
                        }, function (err) {
                            $scope.detailsError = true;
                            console.log('Details failed');
                            console.log(err);
                        })
                        // get species information
                        .then(function (res) {
                            $scope.species = PokemonSpeciesFactory.parseSpecies(res.data);
                            return PokemonEvolutionFactory.getEvolutionChain($scope.species.evolutionChainUrl);
                        }, function (err) {
                            $scope.speciesError = true;
                            console.log('Species failed');
                            console.log(err);
                        })
                        // get evolution information
                        .then(function (res) {
                            $scope.evolution = res.data;
                            evolutionCount = getEvolutionCount($scope.evolution);

                        }, function (err) {
                            $scope.evoError = true;
                            console.log('Evolution failed');
                            console.log(err);
                        });
                }]), angular.module('pokemon')
                    .controller('PokemonNameController', ['$scope', 'PokemonNameFactory', function ($scope, PokemonNameFactory) {

                        $scope.loaded = false;
                        PokemonNameFactory.getAllNames(function (err, names) {
                            if (err) {
                                $scope.error = true;
                                $scope.loaded = true;
                                return console.log(err);
                            }

                            if (names !== undefined) {
                                $scope.loaded = true;
                                $scope.names = names;
                            }

                        });
                    }]), angular.module('pokemon')
                        .directive('back', ['$window', function ($window) {
                            return {
                                link: function (scope, element, attrs) {
                                    element.on('click', function () {
                                        $window.history.back();
                                    });
                                }
                            };
                        }]), angular.module('pokemon')
                            .directive('fallbackSrc', function () {
                                var fallbackSrc = {
                                    link: function postLink(scope, iElement, iAttrs) {
                                        iElement.bind('error', function () {
                                            angular.element(this).attr("src", iAttrs.fallbackSrc);
                                        });
                                    }
                                };
                                return fallbackSrc;
                            }), angular.module('pokemon')
                                .directive('paginate', ['$location', function ($location) {
                                    return {
                                        restrict: 'E',
                                        scope: {
                                            pages: '=',
                                            currentPage: '='
                                        },
                                        templateUrl: 'views/paginate.html',
                                        link: function (scope, elem, attr) {
                                            scope.$watch('pages', function (newValue) {
                                                if (newValue) {
                                                    if (scope.currentPage < 4 || scope.pages.length < 6) {
                                                        scope.start = 0;
                                                    } else if (scope.pages.length - scope.currentPage < 3) {
                                                        scope.start = scope.pages.length - 5;
                                                    } else {
                                                        scope.start = scope.currentPage - 3;
                                                    }
                                                }

                                            });
                                        }
                                    };
                                }]), angular.module('pokemon')
                                    .directive('pokemon', ['$location', function ($location) {
                                        return {
                                            restrict: 'E',
                                            scope: {
                                                name: '=',
                                                spriteUrl: '='
                                            },
                                            transclude: true,
                                            templateUrl: 'views/pokemon.html',
                                            link: function (scope, elem, attr) {
                                                elem.bind('click', function () {
                                                    var url = '/pokemon/' + scope.name;
                                                    scope.$apply(function () {
                                                        $location.url(url);
                                                    });
                                                });
                                            }
                                        };
                                    }]), angular.module('pokemon')
                                        .directive('sprite', ['$http', '$location', function ($http, $location) {
                                            return {
                                                restrict: 'E',
                                                scope: {
                                                    name: '=',
                                                    loaded: '&',
                                                    hide: '&'
                                                },
                                                template: '<img class="sprite" ng-src="{{url}}"><span class="sprite-label">{{name | titlecase}}</span>',
                                                link: function (scope, elem, attr) {
                                                    // bug fix: use default variety name to get sprite and for linking
                                                    var checkName = function (name) {
                                                        switch (name) {
                                                            case 'pumpkaboo':
                                                                name = 'pumpkaboo-average';
                                                                return name;
                                                            case 'gourgeist':
                                                                name = 'gourgeist-average';
                                                                return name;
                                                            case 'wormadam':
                                                                name = 'wormadam-plant';
                                                                return name;
                                                            case 'aegislash':
                                                                name = 'aegislash-shield';
                                                                return name;
                                                            case 'darmanitan':
                                                                name = 'darmanitan-standard';
                                                                return name;
                                                            case 'meowstic':
                                                                name = 'meowstic-male';
                                                                return name;
                                                            default:
                                                                return name;
                                                        }
                                                    };

                                                    var getSprite = function (name, callback) {

                                                        $http.get('https://pokeapi.co/api/v2/pokemon/' + checkName(name) + '/', { cache: true })
                                                            .then(function (res) {
                                                                var url = "/pokedex/assets/img/normal/" + res.data.name + ".gif";
                                                                callback(null, url);
                                                            }, function (err) {
                                                                callback(err);
                                                            });
                                                    };

                                                    getSprite(scope.name, function (err, res) {
                                                        if (err) {
                                                            console.log(err);
                                                            elem.find('img').attr('src', '/pokedex/assets/img/normal/' + res.data.name +'.gif');
                                                            scope.hide();
                                                        }

                                                        if (res !== undefined) {
                                                            scope.url = res;
                                                        }
                                                    });

                                                    elem.find('img').on('load', function () {
                                                        scope.loaded();
                                                    });

                                                    elem.bind('click', function () {
                                                        var url = '/pokemon/' + checkName(scope.name);
                                                        scope.$apply(function () {
                                                            $location.url(url);
                                                        });
                                                    });
                                                }
                                            };
                                        }]), angular.module('pokemon')
                                            .factory('PokemonDetailFactory', ['$http', function ($http) {

                                                var parseTypes = function (res) {
                                                    var types = res.map(function (value) {
                                                        return value.type.name;
                                                    });
                                                    return types;
                                                };

                                                var parseAbilities = function (res) {
                                                    var abilities = res.map(function (value) {
                                                        return value.ability.name;
                                                    });
                                                    return abilities;
                                                };

                                                var parseHeightToFeet = function (height) {
                                                    var inches = Math.round(height / 2.54);
                                                    var feet = (inches / 12).toFixed(1);

                                                    return feet + ' ft';
                                                };

                                                var parseWeightToLbs = function (weight) {
                                                    var lbs = ((weight / 10) * 2.2046).toFixed(2);
                                                    return lbs + ' lbs';
                                                };

                                                var parseSprite = function (id, gender, spriteExists) {
                                                    if (gender === 'male' && spriteExists) {
                                                        return id;
                                                    } else if (gender === 'female' && spriteExists) {
                                                        return id;
                                                    } else {
                                                        return id;
                                                    }
                                                };


                                                return {
                                                    getDetails: function (name) {
                                                        return $http.get('https://pokeapi.co/api/v2/pokemon/' + name + '/', { cache: true });
                                                    },

                                                    parsePersonalTraits: function (traits) {
                                                        var pokemon = {
                                                            height: {
                                                                ft: parseHeightToFeet(traits.height * 10),
                                                                m: (traits.height / 10).toFixed(2) + ' m'
                                                            },
                                                            weight: {
                                                                lbs: parseWeightToLbs(traits.weight),
                                                                kg: (traits.weight / 10).toFixed(2) + ' kg'
                                                            },
                                                            type: parseTypes(traits.types),
                                                            stats: traits.stats,
                                                            abilities: parseAbilities(traits.abilities),
                                                            species: traits.species,
                                                            sprites: {
                                                                male: parseSprite(traits.id, 'male', traits.sprites.front_default),
                                                                female: parseSprite(traits.id, 'female', traits.sprites.front_female)
                                                            }
                                                        };
                                                        return pokemon;
                                                    }
                                                };
                                            }]), angular.module('pokemon')
                                                .factory('PokemonEvolutionFactory', ['$http', function ($http) {

                                                    return {
                                                        getEvolutionChain: function (url) {
                                                            return $http.get(url, { cache: true });
                                                        }
                                                    };

                                                }]), angular.module('pokemon')
                                                    .factory('PokemonNameFactory', ['$http', 'lodash', function ($http, lodash) {

                                                        var getNames = function (creatures) {
                                                            var results = creatures.map(function (pokemon) {
                                                                return pokemon.name;
                                                            });

                                                            return results;
                                                        };

                                                        return {
                                                            getAllNames: function (callback) {
                                                                $http.get('https://pokeapi.co/api/v2/pokemon/', { cache: true })
                                                                    .then(function (res) {
                                                                        var count = res.data.count;
                                                                        $http.get('https://pokeapi.co/api/v2/pokemon/?limit=' + count, { cache: true })
                                                                            .then(function (res) {
                                                                                callback(null, getNames(res.data.results));
                                                                            })
                                                                            .then(function (err) {
                                                                                callback(err);
                                                                            });
                                                                    })
                                                                    .then(function (err) {
                                                                        callback(err);
                                                                    });
                                                            }
                                                        };
                                                    }]), angular.module('pokemon')
                                                        .factory('PokemonSpeciesFactory', ['$http', function ($http) {

                                                            var parseHabitat = function (data) {
                                                                if (data === null) {
                                                                    return null;
                                                                } else {
                                                                    return data.name;
                                                                }
                                                            };

                                                            var parseGender = function (data) {
                                                                if (data === -1) {
                                                                    return {
                                                                        male: null,
                                                                        female: null,
                                                                        genderless: 'Genderless'
                                                                    };
                                                                } else {
                                                                    return {
                                                                        male: Math.floor(((8 - data) / 8) * 100) + '%',
                                                                        female: Math.floor((data / 8) * 100) + '%',
                                                                        genderless: false
                                                                    };
                                                                }
                                                            };


                                                            return {
                                                                getSpecies: function (url) {
                                                                    return $http.get(url, { cache: true });
                                                                },

                                                                parseSpecies: function (data) {
                                                                    var species = {
                                                                        name: data.name,
                                                                        genderRate: parseGender(data.gender_rate),
                                                                        captureRate: data.capture_rate,
                                                                        growthRate: data.growth_rate.name,
                                                                        color: data.color.name,
                                                                        evolutionChainUrl: data.evolution_chain.url,
                                                                        generation: data.generation.name,
                                                                        habitat: parseHabitat(data.habitat) || 'unavailable',
                                                                        genus: data.genera[0].genus,
                                                                        varieties: data.varieties
                                                                    };

                                                                    return species;
                                                                }
                                                            };
                                                        }]), angular.module('pokemon')
                                                        .filter('myLimitTo', function(){
                                                            return function(input, limit, begin) {
                                                                return input.slice(begin, begin + limit);
                                                              };
                                                        }), angular.module('pokemon')
                                                        .filter('titlecase', ['lodash', function(lodash){
                                                            return function(lowerString){
                                                                var specialCaseCaps = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'dna', 'hp'];
                                                                var splitString = lowerString.split('-');
                                                                var capSubstrings = splitString.map(function(substring){
                                                                    if(specialCaseCaps.indexOf(substring) > -1){
                                                                        return substring.toUpperCase();
                                                                    } else {
                                                                        return lodash.capitalize(substring);
                                                                    }
                                                                    
                                                                });
                                                                var titleCasedString = capSubstrings.join(' ');
                                                                return titleCasedString;
                                                            };
                                                        }]), angular.module('pokemon').filter('replace', [function () {
                                                            return function (input, from, to) {
                                                                if (input === undefined) {
                                                                    return;
                                                                }
                                                                var regex = new RegExp(from, 'g');
                                                                return input.replace(regex, to);
                                                            };
                                                        }]), angular.module('pokemon').filter('capitalize', [function () {
                                                            return capitalize
                                                        }]);